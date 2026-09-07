import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) => <section role="dialog" aria-label={title} onClickCapture={event => { if (event.target instanceof Element && event.target.closest("[data-modal-close]")) onClose(); }}>{children}</section> }));
vi.mock("../server/actions", () => ({ saveTransactionAction: vi.fn(), deleteTransactionAction: vi.fn() }));
import { saveTransactionAction, deleteTransactionAction } from "../server/actions";
import { TransactionEditor } from "./transaction-editor";
import { TransactionsScreen } from "./transactions-screen";
import { transactionFiltersSchema, type Transaction } from "../model";
import type { FinancialAccount } from "@/modules/accounts/model";
import type { Category } from "@/modules/categories/model";

const accounts: FinancialAccount[] = [
  { id: "a", name: "Efectivo", accountType: "cash", currency: "DOP", openingBalance: "500", balance: "500", creditLimit: null, institution: null, description: null, color: null, status: "active", revision: "", hasTransactions: false },
  { id: "b", name: "Ahorros", accountType: "savings", currency: "DOP", openingBalance: "0", balance: "0", creditLimit: null, institution: null, description: null, color: null, status: "active", revision: "", hasTransactions: false },
  { id: "c", name: "Dólares", accountType: "bank", currency: "USD", openingBalance: "20", balance: "20", creditLimit: null, institution: null, description: null, color: null, status: "active", revision: "", hasTransactions: false },
];
const categories: Category[] = [{ id: "food", name: "Alimentación", categoryType: "expense", icon: "utensils", color: "#F2994A", isDefault: true, isActive: true, revision: "" }, { id: "salary", name: "Salario", categoryType: "income", icon: null, color: null, isDefault: true, isActive: true, revision: "" }];
const row: Transaction = { id: "one", type: "expense", sourceAccountId: "a", destinationAccountId: null, sourceName: "Efectivo", destinationName: null, sourceCurrency: "DOP", destinationCurrency: null, sourceAmount: "100", destinationAmount: null, categoryId: "food", categoryName: "Alimentación", categoryIcon: "utensils", categoryColor: "#F2994A", occurredLocal: "2026-09-02T12:30", description: "Supermercado", notes: "Compra semanal", paymentMethod: "Efectivo", version: 1 };
const editor = () => render(<TransactionEditor id="new" accounts={accounts} categories={categories} timezone="America/Santo_Domingo" onClose={vi.fn()} onSaved={vi.fn()} />);
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("conserva tipo, monto y descripción ante errores y enfoca el campo", async () => {
  vi.mocked(saveTransactionAction).mockResolvedValue({ status: "error", message: "Revisa los campos", fields: { destinationAccountId: ["Selecciona una cuenta."] } });
  editor();
  fireEvent.click(screen.getByRole("radio", { name: "Ingreso" }));
  fireEvent.change(screen.getByLabelText(/^Monto/), { target: { value: "30.12" } });
  fireEvent.change(screen.getByLabelText(/^Descripción/), { target: { value: "Trabajo" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar transacción" }));
  await screen.findByRole("alert");
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Cuenta" })).toHaveFocus());
  expect(screen.getByLabelText(/^Monto/)).toHaveValue("30.12");
  expect(screen.getByLabelText(/^Descripción/)).toHaveValue("Trabajo");
  expect(screen.getByRole("radio", { name: "Ingreso" })).toBeChecked();
  expect(screen.queryByRole("option", { name: "Alimentación" })).not.toBeInTheDocument();
});
it("iguala el importe recibido de transferencias en la misma moneda", async () => {
  vi.mocked(saveTransactionAction).mockResolvedValue({ status: "error", message: "Prueba" });
  editor();
  fireEvent.click(screen.getByRole("radio", { name: "Transferir" }));
  fireEvent.change(screen.getByLabelText(/^Monto enviado/), { target: { value: "100.1234" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Cuenta de origen" }), { target: { value: "a" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Cuenta de destino" }), { target: { value: "b" } });
  expect(screen.queryByRole("combobox", { name: "Categoría" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Guardar transacción" }));
  await waitFor(() => expect(saveTransactionAction).toHaveBeenCalled());
  expect(vi.mocked(saveTransactionAction).mock.calls[0][1].get("receivedAmount")).toBe("100.1234");
});
it("pide el monto recibido para monedas diferentes", async () => {
  vi.mocked(saveTransactionAction).mockResolvedValue({ status: "error", message: "Prueba" });
  editor();
  fireEvent.click(screen.getByRole("radio", { name: "Transferir" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Cuenta de origen" }), { target: { value: "a" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Cuenta de destino" }), { target: { value: "c" } });
  fireEvent.change(screen.getByLabelText("Monto recibido (USD)"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar transacción" }));
  await waitFor(() => expect(saveTransactionAction).toHaveBeenCalled());
  expect(vi.mocked(saveTransactionAction).mock.calls[0][1].get("receivedAmount")).toBe("2");
});
it("explica la ausencia de cuentas activas y bloquea el envío", () => {
  render(<TransactionEditor id="new" accounts={[]} categories={categories} timezone="UTC" onClose={vi.fn()} onSaved={vi.fn()} />);
  expect(screen.getByRole("link", { name: "Ir a mis cuentas" })).toHaveAttribute("href", "/accounts");
  expect(screen.getByRole("button", { name: "Guardar transacción" })).toBeDisabled();
});
it("abre detalle y pide confirmación antes de eliminar", () => {
  render(<TransactionsScreen accounts={accounts} categories={categories} filters={transactionFiltersSchema.parse({})} history={{ transactions: [row], count: 1, totals: [], timezone: "UTC" }} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Ver detalle: Supermercado" })[0]);
  expect(screen.getByRole("dialog", { name: "Detalle de transacción" })).toBeInTheDocument();
  expect(screen.getByText("Compra semanal")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
  expect(screen.getByRole("button", { name: "Confirmar eliminación" })).toBeInTheDocument();
  expect(deleteTransactionAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Conservar" }));
  expect(screen.getByRole("dialog", { name: "Detalle de transacción" })).toBeInTheDocument();
});
it("conserva los filtros en los enlaces de paginación", () => {
  render(<TransactionsScreen accounts={accounts} categories={categories} filters={transactionFiltersSchema.parse({ type: "expense", q: "café" })} history={{ transactions: [row], count: 21, totals: [], timezone: "UTC" }} />);
  const next = screen.getByRole("link", { name: "Siguiente" }).getAttribute("href");
  expect(next).toContain("type=expense");
  expect(next).toContain("page=2");
  expect(screen.getByRole("searchbox")).toHaveValue("café");
});
