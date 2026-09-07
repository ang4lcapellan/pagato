import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { LandingEnhancements, LandingHeader } from "./landing-interactions";

afterEach(cleanup);

it("opens the accessible landing menu and closes it with Escape or navigation", () => {
  render(<LandingHeader />);
  const button = screen.getByLabelText("Abrir o cerrar menú");
  const details = button.closest("details")!;
  details.open = true;
  fireEvent.keyDown(window, { key: "Escape" });
  expect(details.open).toBe(false);
  details.open = true;
  fireEvent.click(within(screen.getByRole("navigation", { name: "Navegación móvil de la portada", hidden: true })).getByRole("link", { name: "Seguridad", hidden: true }));
  expect(details.open).toBe(false);
});

it("renders a usable CTA without waiting for client-side hydration", () => {
  render(<LandingEnhancements />);
  expect(screen.getByRole("complementary", { name: "Comenzar a usar PagaTo" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Crear mi cuenta" })).toHaveAttribute("href", "/auth/sign-up");
});
