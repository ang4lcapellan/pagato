import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "@playwright/test";
const source = p => JSON.stringify(`/@fs/${resolve(p).replaceAll("\\", "/")}`);
const stubs = {
  link: `import {createElement} from 'react'; export default function Link({href,...props}) {return createElement('a',{...props,href});}`,
  image: `import {createElement} from 'react'; export default function Image({priority,...props}) {return createElement('img',props);}`,
  navigation: `const router={refresh(){window.__refreshes=(window.__refreshes||0)+1},push(url){window.__destination=url}}; export function useRouter(){return router;}`,
  auth: `export async function signOutAction(){}`,
  dashboard: `import {accounts,categories} from ${source("tests/ui/dashboard/fixtures.ts")}; export async function loadDashboardOptionsAction(){return {status:'ready',accounts,categories}}`,
  transactions: `import {transactionInputSchema} from ${source("src/modules/transactions/model.ts")}; export async function saveTransactionAction(state,form){window.__lastTransaction=Object.fromEntries(form);const parsed=transactionInputSchema.safeParse(window.__lastTransaction);return parsed.success?{status:'success',message:'Transacción registrada.'}:{status:'error',message:'Revisa los campos.',fields:parsed.error.flatten().fieldErrors}}; export async function deleteTransactionAction(state,form){window.__lastDelete=Object.fromEntries(form);return {status:'success',message:'Transacción eliminada.'}}`,
};
const server = await createServer({ configFile: false, root: resolve("tests/ui/dashboard"), publicDir: resolve("public"),
  plugins: [{ name: "dashboard-fixtures", enforce: "pre", resolveId(id, importer) {
    const key = ({ "next/link": "link", "next/image": "image", "next/navigation": "navigation", "@/modules/auth/actions": "auth" })[id];
    if (key) return `\0fixture:${key}`;
    if (id.endsWith("/modules/auth/actions")) return "\0fixture:auth";
    if (id.endsWith("/server/actions")) return importer?.replaceAll("\\", "/").includes("/dashboard/") ? "\0fixture:dashboard" : "\0fixture:transactions";
  }, load(id) { if (id.startsWith("\0fixture:")) return stubs[id.slice(9)]; },
  configureServer(vite) {
    vite.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1:4176");
      if (request.method !== "GET" || url.pathname !== "/") return next();
      try {
        // Generate HTML in Node, then hydrate it in Chromium, just like a first page load.
        const { renderPreview } = await vite.ssrLoadModule("/server.tsx");
        const markup = renderPreview(url.searchParams.get("mode"));
        const template = await readFile(resolve("tests/ui/dashboard/index.html"), "utf8");
        const html = await vite.transformIndexHtml(request.url, template.replace('<div id="root"></div>', () => `<div id="root">${markup}</div>`));
        response.statusCode = 200; response.setHeader("Content-Type", "text/html"); response.end(html);
      } catch (error) { next(error); }
    });
  } }, react()],
  resolve: { alias: { "@": resolve("src") } }, css: { postcss: { plugins: [tailwind()] } },
  ssr: { noExternal: ["next"] },
  server: { host: "127.0.0.1", port: 4176, strictPort: true, fs: { allow: [process.cwd()] } },
});
let browser;
try {
  await server.listen(); browser = await chromium.launch(); await mkdir("test-results/dashboard", { recursive: true });
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ locale: "es-DO", viewport: { width, height: width > 1000 ? 1000 : 844 } });
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto("http://127.0.0.1:4176"); await page.getByRole("heading", { name: "Hola, Alex" }).waitFor();
    await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow ${width}`);
    assert.equal(await page.getByRole("progressbar").last().getAttribute("aria-valuenow"), "100");
    await page.screenshot({ path: `test-results/dashboard/home-${width}.png`, fullPage: true, animations: "disabled" });
    await page.getByText("Ver cifras del gráfico", { exact: true }).click(); await page.getByRole("table").waitFor();
    assert.equal(await page.getByRole("row").count(), 6);
    if (width < 600) await page.getByRole("button", { name: /Cambiar período/ }).click();
    await page.getByLabel("Período", { exact: true }).selectOption("custom");
    await page.getByLabel("Desde", { exact: true }).fill("2026-09-15"); await page.getByLabel("Hasta", { exact: true }).fill("2026-09-01");
    await page.getByRole("button", { name: "Aplicar", exact: true }).click(); await page.getByRole("alert").waitFor();
    await page.getByLabel("Hasta", { exact: true }).fill("2026-09-30"); await page.getByLabel("Moneda", { exact: true }).selectOption("USD");
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await page.waitForFunction(() => window.__destination?.includes("currency=USD") && window.__destination?.includes("from=2026-09-15"));
    await page.getByLabel("Período", { exact: true }).selectOption("year"); await page.getByLabel("Año", { exact: true }).fill("2028");
    await page.getByRole("button", { name: "Aplicar", exact: true }).click(); await page.waitForFunction(() => window.__destination?.includes("year=2028"));
    await page.getByRole("button", { name: "Nueva transacción", exact: true }).click(); await page.getByRole("dialog").waitFor();
    await page.getByLabel("Cuenta", { exact: true }).selectOption({ label: "Cuenta principal · DOP" });
    await page.getByLabel("Monto (DOP)", { exact: true }).fill("125.0001");
    await page.getByLabel("Categoría", { exact: true }).selectOption({ label: "Alimentación" });
    await page.getByRole("button", { name: "Guardar transacción", exact: true }).click(); await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => window.__lastTransaction.amount), "125.0001");
    assert.equal(await page.evaluate(() => window.__refreshes), 1);
    await page.getByRole("button", { name: /Compra del supermercado/ }).click(); await page.getByRole("dialog", { name: "Detalle de transacción" }).waitFor();
    await page.getByRole("button", { name: "Editar transacción", exact: true }).click(); await page.getByRole("dialog", { name: "Editar transacción" }).waitFor();
    await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: /Compra del supermercado/ }).click(); await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar eliminación", exact: true }).click(); await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => window.__lastDelete.version), "1");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.ok(await page.locator(".dashboard-bar").first().evaluate(e => parseFloat(getComputedStyle(e).animationDuration) < .01));
    for (const mode of ["empty", "error", "loading", "large"]) {
      await page.goto(`http://127.0.0.1:4176/?mode=${mode}`);
      await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
      await page.locator(mode === "error" ? '[role="alert"]' : mode === "loading" ? '[aria-busy="true"]' : ".dashboard-balance").waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow ${width} ${mode}`);
      if (mode === "error") { await page.getByRole("button", { name: "Reintentar" }).click(); assert.equal(await page.evaluate(() => window.__refreshes), 1); }
      if (mode !== "large") await page.screenshot({ path: `test-results/dashboard/${mode}-${width}.png`, fullPage: true, animations: "disabled" });
    }
    assert.deepEqual(errors, []); await page.close(); console.log(`OK: dashboard ${width}px; SSR e hidratación sin errores, filtros, gráficos, formularios, detalle, eliminación, estados y movimiento reducido.`);
  }
} finally { await browser?.close(); await server.close(); }
