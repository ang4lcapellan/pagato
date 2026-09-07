import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProfileSummary } from "./profile-summary";

it("muestra preferencias reales y el resumen de categorías, sin simular finanzas", () => {
  render(<ProfileSummary profile={{
    id: "profile-id", displayName: "Ana", email: "ana@example.invalid",
    preferences: { theme: "dark", locale: "es", baseCurrency: "DOP", timezone: "America/Santo_Domingo", dateFormat: "DD/MM/YYYY" },
    defaultCategories: { income: 2, expense: 8 },
  }} />);
  expect(screen.getByText("Perfil conectado")).toBeInTheDocument();
  expect(screen.getByText("DOP")).toBeInTheDocument();
  expect(screen.getByText("Oscuro")).toBeInTheDocument();
  expect(screen.getByText("2 de ingresos y 8 de gastos.")).toBeInTheDocument();
  expect(screen.queryByText(/balance total/i)).not.toBeInTheDocument();
});
