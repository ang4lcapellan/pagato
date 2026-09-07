import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../server/actions", () => ({ saveAccountAction: vi.fn(), changeAccountStatusAction: vi.fn() }));
import { AccountsScreen } from "./accounts-screen";
import type { FinancialAccount } from "../model";

afterEach(cleanup);
const accounts: FinancialAccount[] = [
  { id: "one", name: "Banco de prueba", accountType: "bank", currency: "DOP", openingBalance: "100", balance: "100", creditLimit: null, institution: "Institución de prueba", description: null, color: "#0B6B58", status: "active", revision: "2026-09-02T10:00:00Z", hasTransactions: false },
  { id: "two", name: "Ahorros archivados", accountType: "savings", currency: "USD", openingBalance: "500", balance: "500", creditLimit: null, institution: null, description: null, color: null, status: "archived", revision: "2026-09-02T10:00:00Z", hasTransactions: false },
];
it("presenta un estado vacío sin saldos inventados", () => {
  render(<AccountsScreen accounts={[]} defaultCurrency="DOP" />);
  expect(screen.getByText("Tu dinero, bien organizado")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Crear mi primera cuenta" })).toBeInTheDocument();
});
it("filtra activas, archivadas, búsqueda y moneda", () => {
  render(<AccountsScreen accounts={accounts} defaultCurrency="DOP" />);
  expect(screen.getByRole("article", { name: "Banco de prueba" })).toBeInTheDocument();
  expect(screen.queryByRole("article", { name: "Ahorros archivados" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Archivadas" }));
  expect(screen.getByRole("article", { name: "Ahorros archivados" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "sin coincidencias" } });
  expect(screen.getByText("No encontramos cuentas")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por moneda" }), { target: { value: "USD" } });
  expect(screen.queryByRole("article", { name: "Banco de prueba" })).not.toBeInTheDocument();
});
