import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ title, children }: { title: string; children: ReactNode }) => <section role="dialog" aria-label={title}>{children}</section> }));
vi.mock("../server/actions", () => ({ saveBudgetAction: vi.fn(), changeBudgetStatusAction: vi.fn() }));
import { saveBudgetAction, changeBudgetStatusAction } from "../server/actions";
import { BudgetEditor } from "./budget-editor";
import { BudgetsScreen } from "./budgets-screen";
import type { Category } from "@/modules/categories/model";
import type { Budget, BudgetList } from "../model";
const categories: Category[] = [
  { id: "food", name: "Alimentación", categoryType: "expense", isActive: true, isDefault: true, revision: "", icon: null, color: null },
  { id: "salary", name: "Salario", categoryType: "income", isActive: true, isDefault: true, revision: "", icon: null, color: null },
  { id: "old", name: "Inactiva", categoryType: "expense", isActive: false, isDefault: false, revision: "", icon: null, color: null },
];
const budget: Budget = { id: "one", name: "Comida septiembre", categoryId: "food", categoryName: "Alimentación", categoryIcon: "utensils", categoryColor: null, categoryActive: true,
  amount: "1000", spent: "1250", currency: "DOP", periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "active", revision: "2026-09-01T00:00:00Z" };
const data: BudgetList = { budgets: [budget], totals: [{ currency: "DOP", amount: "1000", spent: "1250", count: 1 }], count: 1, timezone: "America/Santo_Domingo" };
const props = { data, categories, filters: { month: "2026-09", status: "active" as const, page: 1 }, currentMonth: "2026-09", currency: "DOP" };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("shows real progress above 100%, available and exceeded without overfilling the bar", () => {
  render(<BudgetsScreen {...props} />);
  const card = within(screen.getByRole("article", { name: budget.name }));
  expect(card.getByText("125.00% usado")).toBeInTheDocument();
  expect(card.getByText("Límite superado")).toBeInTheDocument();
  expect(card.getByText("Excedido")).toBeInTheDocument();
  expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
});
it("only offers active expense categories and defaults the month dates", () => {
  render(<BudgetEditor id="new" categories={categories} month="2028-02" currency="DOP" onClose={vi.fn()} onSaved={vi.fn()} />);
  expect(screen.getByLabelText("Fecha inicial")).toHaveValue("2028-02-01");
  expect(screen.getByLabelText("Fecha final")).toHaveValue("2028-02-29");
  const select = within(screen.getByLabelText("Categoría de gasto"));
  expect(select.getByRole("option", { name: "Alimentación" })).toBeInTheDocument();
  expect(select.queryByRole("option", { name: "Salario" })).not.toBeInTheDocument();
  expect(select.queryByRole("option", { name: "Inactiva" })).not.toBeInTheDocument();
});
it("preserves input and request ID after validation errors", async () => {
  vi.mocked(saveBudgetAction).mockResolvedValue({ status: "error", message: "Revisa el monto", fields: { amount: ["Monto inválido"] } });
  render(<BudgetEditor id="stable-id" categories={categories} month="2026-09" currency="DOP" onClose={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Nombre del presupuesto"), { target: { value: "Mi límite" } });
  fireEvent.change(screen.getByLabelText("Límite de gasto"), { target: { value: "-20" } });
  fireEvent.click(screen.getByRole("button", { name: "Crear presupuesto" }));
  await screen.findByText("Monto inválido");
  expect(screen.getByLabelText("Nombre del presupuesto")).toHaveValue("Mi límite");
  expect(screen.getByLabelText("Límite de gasto")).toHaveFocus();
  expect(vi.mocked(saveBudgetAction).mock.calls[0][1].get("id")).toBe("stable-id");
});
it("shows a helpful empty state and opens creation", () => {
  render(<BudgetsScreen {...props} data={{ ...data, budgets: [], totals: [], count: 0 }} />);
  expect(screen.getByText("Sin presupuestos para esta selección")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Nuevo presupuesto" }));
  expect(screen.getByRole("dialog", { name: "Nuevo presupuesto" })).toBeInTheDocument();
});
it("directs users without expense categories to settings", () => {
  render(<BudgetEditor id="new" categories={[]} month="2026-09" currency="DOP" onClose={vi.fn()} onSaved={vi.fn()} />);
  expect(screen.getByRole("link", { name: "Gestionar categorías" })).toHaveAttribute("href", "/categories");
  expect(screen.queryByRole("button", { name: "Crear presupuesto" })).not.toBeInTheDocument();
});
it("confirms archive and refreshes the screen after success", async () => {
  vi.mocked(changeBudgetStatusAction).mockResolvedValue({ status: "success", message: "Archivado" });
  render(<BudgetsScreen {...props} />);
  fireEvent.click(screen.getByRole("button", { name: `Archivar ${budget.name}` }));
  expect(screen.getByRole("dialog", { name: "Archivar presupuesto" })).toHaveTextContent("Tus gastos y saldos no se modificarán");
  fireEvent.click(screen.getByRole("button", { name: "Archivar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(refresh).toHaveBeenCalled();
});
it("keeps summaries separated by currency and supports pagination", () => {
  render(<BudgetsScreen {...props} data={{ ...data, count: 13, totals: [...data.totals, { currency: "USD", amount: "20", spent: "10", count: 1 }] }} />);
  expect(screen.getByRole("heading", { name: "Presupuesto DOP" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Presupuesto USD" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Siguiente" })).toHaveAttribute("href", "/budgets?month=2026-09&status=active&page=2&view=individual");
});
