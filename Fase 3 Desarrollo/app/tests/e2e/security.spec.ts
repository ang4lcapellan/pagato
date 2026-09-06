import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("pagato.telemetry-consent.v1", "declined"));
});

test("envía una política CSP con nonce y cabeceras defensivas", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();

  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("script-src 'self' 'nonce-");
  expect(headers["content-security-policy"]).toContain("'strict-dynamic'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

  await expect(page.getByRole("heading", { name: /entiende tu dinero/i })).toBeVisible();
});

test("rechaza cuerpos excesivos antes de entregarlos al proveedor de autenticación", async ({ request }) => {
  const response = await request.post("/api/auth/sign-in/email", {
    data: "x".repeat(65 * 1024),
    headers: { "content-type": "text/plain" },
  });
  expect(response.status()).toBe(413);
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("fuerza recursos HTTPS solo cuando la solicitud original ya es segura", async ({ request }) => {
  const local = await request.get("/");
  expect(local.headers()["content-security-policy"]).not.toContain("upgrade-insecure-requests");
  const secure = await request.get("/", { headers: { "x-forwarded-proto": "https" } });
  expect(secure.headers()["content-security-policy"]).toContain("upgrade-insecure-requests");
});
