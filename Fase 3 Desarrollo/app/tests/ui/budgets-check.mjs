import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "@playwright/test";

// Run the real components and stylesheet with isolated, in-memory actions; no auth or database writes.
const stubs = {
  link: `import {createElement} from 'react'; export default function Link({href,...props}) { return createElement('a',{...props,href}); }`,
  image: `import {createElement} from 'react'; export default function Image({priority,...props}) { return createElement('img',props); }`,
  navigation: `const router = {refresh(){window.__refreshes = (window.__refreshes || 0)+1;},push(url){window.__destination=url;}}; export function useRouter(){return router;}`,
  actions: `import {budgetInputSchema} from ${JSON.stringify(`/@fs/${resolve("src/modules/budgets/model.ts").replaceAll("\\", "/")}`)};
    export async function saveBudgetAction(state,form) {window.__lastBudget=Object.fromEntries(form); const parsed=budgetInputSchema.safeParse(window.__lastBudget); await new Promise(r=>setTimeout(r,80)); return parsed.success ? {status:'success',message:'Presupuesto guardado.'} : {status:'error',message:'Revisa los campos marcados.',fields:parsed.error.flatten().fieldErrors};}
    export async function changeBudgetStatusAction(state,form) {window.__lastStatus=Object.fromEntries(form); return {status:'success',message:'Estado actualizado.'};}
    export async function saveCategoryAction(){return {status:'success',message:'Categoría creada.'};}
    export async function signOutAction(){}`,
  monthly: `import {planSchema,copyPlanSchema} from ${JSON.stringify(`/@fs/${resolve("src/modules/budgets/plans/model.ts").replaceAll("\\", "/")}`)};
    export async function savePlanAction(state,form){const raw=Object.fromEntries(form); window.__lastPlan=raw; const result=planSchema.safeParse({...raw,allocations:JSON.parse(raw.allocations || '[]')}); return result.success ? {status:'success',id:raw.id,version:Number(raw.version || 0)+1,message:'Presupuesto guardado.'} : {status:'error',message:'Revisa los campos.',fields:result.error.flatten().fieldErrors};}
    export async function copyPlanAction(state,form){const raw=Object.fromEntries(form);window.__lastCopy=raw;return copyPlanSchema.safeParse(raw).success ? {status:'success',id:raw.id,message:'Copiado.'} : {status:'error',message:'Revisa el mes.'};}
    export async function changePlanStatusAction(state,form){window.__lastPlanStatus=Object.fromEntries(form);return {status:'success',message:'Archivado.'};}`,
};
const server = await createServer({
  configFile: false, root: resolve("tests/ui/budgets"), publicDir: resolve("public"),
  plugins: [{ name: "budget-ui-fixtures", enforce: "pre", resolveId(id, importer) {
    const key = ({ "next/link": "link", "next/image": "image", "next/navigation": "navigation" })[id];
    if (key) return `\0fixture:${key}`;
    if (id.endsWith("/plans/actions") || (id === "../actions" && importer?.replaceAll("\\", "/").includes("/plans/"))) return "\0fixture:monthly";
    if (id.endsWith("/server/actions") || id === "@/modules/auth/actions" || id.endsWith("/modules/auth/actions")) return "\0fixture:actions";
  }, load(id) { if (id.startsWith("\0fixture:")) return stubs[id.slice(9)]; } }, react()],
  resolve: { alias: { "@": resolve("src") } },
  css: { postcss: { plugins: [tailwind()] } },
  server: { host: "127.0.0.1", port: 4175, strictPort: true, fs: { allow: [process.cwd()] } },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  await mkdir("test-results/budgets", { recursive: true });
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ locale: "es-DO", viewport: { width, height: width > 1000 ? 1000 : 844 } });
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    if (process.argv.includes("--monthly")) {
      await page.goto("http://127.0.0.1:4175/?monthly=1&screen=overview");
      await page.getByRole("heading", { name: "Primero tu mes, después tus categorías" }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `test-results/budgets/monthly-list-${width}.png`, fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "Nuevo presupuesto mensual", exact: true }).click();
      await page.getByLabel("Límite mensual", { exact: true }).fill("25000");
      await page.getByLabel("Ingreso mensual estimado (opcional)").fill("30000");
      await page.getByRole("button", { name: "Crear presupuesto mensual", exact: true }).click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => window.__lastPlan.allocations), "[]");
      await page.getByRole("button", { name: "Copiar Presupuesto Septiembre 2026", exact: true }).click();
      assert.equal(await page.getByLabel("Mes del presupuesto").inputValue(), "2026-10");
      await page.getByRole("button", { name: "Copiar al nuevo mes", exact: true }).click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => window.__lastCopy.sourceVersion), "1");
      await page.goto("http://127.0.0.1:4175/?monthly=1");
      await page.getByRole("heading", { name: "Planifica tu mes", exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Monthly overflow ${width}`);
      assert.equal(await page.getByRole("slider").count(), 4);
      await page.screenshot({ path: `test-results/budgets/monthly-workspace-${width}.png`, fullPage: true, animations: "disabled" });
      const actual = await page.getByRole("region", { name: "Gastos reales del mes" }).innerText();
      await page.getByLabel("Límite categoría 1", { exact: true }).fill("30000");
      assert.equal(await page.getByRole("button", { name: "Guardar distribución", exact: true }).isDisabled(), true);
      await page.getByLabel("Límite categoría 1", { exact: true }).fill("3200");
      await page.getByRole("slider").first().focus();
      await page.keyboard.press("ArrowRight");
      assert.notEqual(await page.getByLabel("Límite categoría 1", { exact: true }).inputValue(), "3200");
      assert.equal(await page.getByRole("region", { name: "Gastos reales del mes" }).innerText(), actual);
      assert.equal(await page.getByRole("button", { name: "Copiar a otro mes", exact: true }).isDisabled(), true);
      await page.getByRole("button", { name: "Guardar distribución", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Presupuesto guardado." }).waitFor();
      assert.equal((await page.evaluate(() => JSON.parse(window.__lastPlan.allocations))).length, 4);
      await page.getByRole("button", { name: "Añadir categoría", exact: true }).click();
      await page.getByLabel("Categoría 5", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Quitar categoría 5", exact: true }).click();
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.ok(await page.locator(".budget-card").first().evaluate(e => parseFloat(getComputedStyle(e).animationDuration) < 0.01));
      assert.deepEqual(errors, []);
      console.log(`OK: plan mensual ${width}px, creación, copia, planificación, sliders, límites y separación de gastos reales.`);
      await page.close(); continue;
    }
    await page.goto("http://127.0.0.1:4175");
    await page.getByRole("heading", { name: "Tus límites por categoría" }).waitFor();
    assert.equal(await page.getByRole("article").count(), 6);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
    await page.screenshot({ path: `test-results/budgets/screen-${width}.png`, fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "Nuevo presupuesto", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.equal(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth), true, `Dialog overflow at ${width}`);
    await page.screenshot({ path: `test-results/budgets/form-${width}.png`, animations: "disabled" });
    await page.getByRole("button", { name: "Crear presupuesto", exact: true }).click();
    await page.getByRole("alert").waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
    await page.getByLabel("Nombre del presupuesto").fill("Prueba visual");
    await page.getByLabel("Categoría de gasto").selectOption({ label: "Alimentación" });
    await page.getByLabel("Límite de gasto").fill("1250.50");
    await page.getByRole("button", { name: "Crear presupuesto", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => window.__lastBudget.amount), "1250.50");
    await page.getByRole("button", { name: "Editar Alimentación", exact: true }).click();
    assert.equal(await page.getByLabel("Límite de gasto").inputValue(), "1000");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Archivar Alimentación", exact: true }).click();
    await page.getByRole("button", { name: "Archivar", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => window.__lastStatus.status), "archived");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.ok(await page.locator(".budget-card").first().evaluate(e => parseFloat(getComputedStyle(e).animationDuration) < 0.01));
    assert.deepEqual(errors, []);
    console.log(`OK: ${width}px, tarjetas, formulario, validación, edición, archivo, Escape y movimiento reducido.`);
    await page.close();
  }
} finally { await browser?.close(); await server.close(); }
