import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("pagato.telemetry-consent.v1", "declined"));
});

test("muestra la portada y permite abrir el registro", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /entiende tu dinero/i })).toBeVisible();
  await page.getByRole("link", { name: /crear mi cuenta/i }).first().click();
  await expect(page).toHaveURL(/\/auth\/sign-up$/);
  await expect(page.getByRole("heading", { name: /crea tu cuenta/i })).toBeVisible();
});

test("la portada ofrece navegación móvil, CTA durante scroll y volver arriba", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Abrir o cerrar menú" });
  await expect(menu).toBeVisible(); await menu.click();
  await expect(page.getByRole("navigation", { name: "Navegación móvil de la portada" }).getByRole("link", { name: "Seguridad" })).toBeVisible();
  await page.locator(".landing-scroll-cta").scrollIntoViewIfNeeded();
  await expect(page.locator(".landing-scroll-cta").getByRole("link", { name: "Crear mi cuenta" })).toBeVisible();
  const back = page.getByRole("link", { name: "Volver arriba" }); await back.scrollIntoViewIfNeeded(); await back.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("permite navegar por recuperación de contraseña", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await page.getByRole("link", { name: /olvidaste tu contraseña/i }).click();
  await expect(page).toHaveURL(/\/auth\/forgot-password$/);
  await expect(page.getByRole("heading", { name: /olvidaste tu contraseña/i })).toBeVisible();
});

test("protege el panel sin una sesión activa", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});

test("protege las cuentas sin una sesión activa", async ({ page }) => {
  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole("heading", { name: /inicia sesión/i })).toBeVisible();
});

for (const route of ["/categories", "/settings", "/transactions", "/budgets", "/budgets/10000000-0000-4000-8000-000000000001"]) {
  test(`protege ${route} sin una sesión activa`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
    await expect(page.getByRole("heading", { name: /inicia sesión/i })).toBeVisible();
  });
}

test("el acceso se adapta a una pantalla móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/sign-in");
  await expect(page.getByRole("heading", { name: /inicia sesión/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("registro y recuperación respetan el ancho móvil y los controles táctiles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/auth/sign-in", "/auth/sign-up", "/auth/forgot-password", "/auth/reset-password?token=invalid-test-token"]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toHaveCSS("font-family", /Manrope/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const button of await page.locator("main button").all()) {
      const bounds = await button.boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
    }
  }
});

test("el acceso mantiene el layout a 320 px y respeta movimiento reducido", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/auth/sign-in");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const duration = await page.locator(".auth-grid").evaluate((element) => parseFloat(getComputedStyle(element).animationDuration));
  expect(duration).toBeLessThan(0.01);
});
