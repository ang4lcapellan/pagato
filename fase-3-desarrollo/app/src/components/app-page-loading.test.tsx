import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AppPageLoading } from "./app-page-loading";
afterEach(cleanup);
it("announces the route while its neutral skeleton is visible", () => {
  const { container } = render(<AppPageLoading label="Cargando movimientos" />);
  expect(screen.getByRole("status", { name: "Cargando movimientos" })).toBeInTheDocument();
  expect(container.querySelectorAll(".route-skeleton")).toHaveLength(7);
  expect(container).not.toHaveTextContent(/RD\$|correo|balance/i);
});
