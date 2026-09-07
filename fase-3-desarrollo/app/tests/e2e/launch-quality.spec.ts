import { expect, test } from "@playwright/test";

test("publica metadatos útiles, favicon e imagen social", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PagaTo/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /cuentas.*movimientos.*presupuestos/i);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /PagaTo/i);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  expect(await page.locator("img").evaluateAll(images => images.every(image => image.hasAttribute("alt")))).toBe(true);
});

test("ofrece documentos legales enlazados y una página 404 propia", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Solo necesarias" }).click();
  await expect(page.getByRole("dialog", { name: "Privacidad y medición opcional" })).toBeHidden();
  const privacyLink = page.getByRole("link", { name: "Privacidad" });
  await expect(privacyLink).toHaveAttribute("href", "/privacy");
  await privacyLink.scrollIntoViewIfNeeded();
  await privacyLink.click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "Política de privacidad" })).toBeVisible();
  const termsLink = page.getByRole("link", { name: "Términos y condiciones" });
  await expect(termsLink).toHaveAttribute("href", "/terms");
  await termsLink.scrollIntoViewIfNeeded();
  await termsLink.click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "Términos y condiciones" })).toBeVisible();
  const response = await page.goto("/esta-ruta-no-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
});

test("solicita consentimiento y recuerda la opción sin activar medición por defecto", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("dialog", { name: "Privacidad y medición opcional" });
  await expect(banner).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("pagato.telemetry-consent.v1"))).toBeNull();
  await banner.getByRole("button", { name: "Solo necesarias" }).click();
  await expect(banner).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("pagato.telemetry-consent.v1"))).toBe("declined");
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Privacidad y medición opcional" })).toBeHidden();
});

test("valida y limita el endpoint de métricas", async ({ request }) => {
  const valid = await request.post("/api/telemetry", { data: { name: "LCP", value: 1200, rating: "good", route: "/" } });
  expect(valid.status()).toBe(204);
  const invalid = await request.post("/api/telemetry", { data: { name: "EMAIL", value: 1, rating: "good", route: "/" } });
  expect(invalid.status()).toBe(400);
  const external = await request.post("/api/telemetry", { data: { name: "LCP", value: 1, rating: "good", route: "/" }, headers: { origin: "https://example.com" } });
  expect(external.status()).toBe(403);
});
