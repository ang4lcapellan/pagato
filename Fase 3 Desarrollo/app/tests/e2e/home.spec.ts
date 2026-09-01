import { expect, test } from "@playwright/test";

test("muestra la portada y permite abrir el registro", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /entiende tu dinero/i })).toBeVisible();
  await page.getByRole("link", { name: /crear mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/auth\/sign-up$/);
  await expect(page.getByRole("heading", { name: /crear una cuenta/i })).toBeVisible();
});
