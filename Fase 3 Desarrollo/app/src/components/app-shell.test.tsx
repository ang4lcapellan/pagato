import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/modules/auth/actions", () => ({ signOutAction: vi.fn() }));
import { AppShell } from "./app-shell";
import { PresentationProvider } from "@/modules/preferences/components/presentation-provider";
import { DEFAULT_PREFERENCES } from "@/modules/preferences/model";
afterEach(cleanup);

it.each(["/budgets", "/transactions"] as const)("includes budgets in mobile navigation and marks the current route: %s", active => {
  render(<AppShell active={active} name="Alex"><h1>Contenido</h1></AppShell>);
  const nav = within(screen.getByRole("navigation", { name: "Navegación móvil" }));
  expect(nav.getAllByRole("link").map(link => link.textContent)).toEqual(["Inicio", "Movimientos", "Cuentas", "Presupuestos", "Ajustes"]);
  const budgets = nav.getByRole("link", { name: "Presupuestos" });
  expect(budgets).toHaveAttribute("href", "/budgets");
  if (active === "/budgets") expect(budgets).toHaveAttribute("aria-current", "page");
  else expect(budgets).not.toHaveAttribute("aria-current");
  expect(nav.getAllByRole("link", { current: "page" })).toHaveLength(1);
});
it("keeps the mobile budgets link translated", () => {
  render(<PresentationProvider preferences={{ ...DEFAULT_PREFERENCES, locale: "en" }}><AppShell active="/budgets" name="Alex">Content</AppShell></PresentationProvider>);
  expect(within(screen.getByRole("navigation", { name: "Mobile navigation" })).getByRole("link", { name: "Budgets" })).toHaveAttribute("href", "/budgets");
});
