import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ title, children }: { title: string; children: ReactNode }) => <section role="dialog" aria-label={title}>{children}</section> }));
vi.mock("../actions", () => ({ savePlanAction: vi.fn(), copyPlanAction: vi.fn(), changePlanStatusAction: vi.fn() }));
vi.mock("@/modules/categories/components/category-editor", () => ({ CategoryEditor: () => null }));
import { savePlanAction } from "../actions";
import { PlanWorkspace } from "./plan-workspace";
import { PlanDialog } from "./plan-dialog";
import { PlansScreen } from "./plans-screen";
import type { PlanDetail } from "../model";
import type { Category } from "@/modules/categories/model";
const categories: Category[] = [{ id: "food", name: "Alimentación", categoryType: "expense", icon: "utensils", color: "#16A085", isActive: true, isDefault: true, revision: "" }, { id: "bus", name: "Transporte", categoryType: "expense", icon: "bus", color: "#F2994A", isActive: true, isDefault: true, revision: "" }];
const detail: PlanDetail = { plan: { id: "plan", name: "Presupuesto Septiembre 2026", month: "2026-09", currency: "DOP", amount: "1000", expectedIncome: "1500", periodStart: "2026-09-01", periodEnd: "2026-09-30", version: 1, status: "active", allocated: "600", spent: "100", categorySpent: "50", categoryCount: 1 }, timezone: "UTC", budgets: [{ id: "child", name: "Alimentación", categoryId: "food", currency: "DOP", amount: "600", spent: "50", periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "active", revision: "", categoryName: "Alimentación", categoryIcon: "utensils", categoryColor: "#16A085", categoryActive: true }] };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("keeps actual spending separate from live planned amounts", () => {
  render(<PlanWorkspace detail={detail} categories={categories} />);
  const actual = screen.getByRole("region", { name: "Gastos reales del mes" }).textContent;
  fireEvent.change(screen.getByLabelText("Límite categoría 1"), { target: { value: "750" } });
  expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Gastos reales del mes" }).textContent).toBe(actual);
  expect(screen.getByRole("button", { name: "Copiar a otro mes" })).toBeDisabled();
});
it("slider and manual input agree, blocks excess distribution", () => {
  render(<PlanWorkspace detail={detail} categories={categories} />);
  fireEvent.change(screen.getByRole("slider"), { target: { value: "250" } });
  expect(screen.getByLabelText("Límite categoría 1")).toHaveValue("250.0000");
  fireEvent.change(screen.getByLabelText("Límite categoría 1"), { target: { value: "1001" } });
  expect(screen.getByRole("button", { name: "Guardar distribución" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("supera el límite");
});
it("supports adding/removing allocations without deleting transactions", () => {
  render(<PlanWorkspace detail={detail} categories={categories} />);
  fireEvent.click(screen.getByRole("button", { name: "Añadir categoría" }));
  expect(screen.getByLabelText("Categoría 2")).toBeInTheDocument();
  expect(within(screen.getByLabelText("Categoría 2")).getByRole("option", { name: "Alimentación" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Quitar categoría 1" }));
  expect(screen.getByRole("article", { name: "Progreso de Alimentación" })).toBeInTheDocument();
});
it("sends full distribution and revision, then acknowledges a successful save", async () => {
  vi.mocked(savePlanAction).mockResolvedValue({ status: "success", version: 2, id: "plan", message: "Guardado" });
  render(<PlanWorkspace detail={detail} categories={categories} />);
  fireEvent.change(screen.getByLabelText("Límite categoría 1"), { target: { value: "700" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar distribución" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Guardado"));
  const form = vi.mocked(savePlanAction).mock.calls[0][1];
  expect(form.get("version")).toBe("1");
  expect(JSON.parse(String(form.get("allocations")))).toEqual([{ categoryId: "food", amount: "700" }]);
  expect(form.get("requestId")).toMatch(/^[a-f0-9-]{36}$/);
});
it("monthly creation starts without allocations and names the selected month", () => {
  render(<PlanDialog id="p" requestId="r" month="2026-09" currency="DOP" onClose={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Mes del presupuesto"), { target: { value: "2026-10" } });
  expect(screen.getByLabelText("Nombre del presupuesto")).toHaveValue("Presupuesto Octubre 2026");
  expect(screen.getByRole("button", { name: "Crear presupuesto mensual" })).toBeInTheDocument();
});
it("copy asks for destination only and explains that spending is not copied", () => {
  render(<PlanDialog id="p" requestId="r" source={detail.plan} month="2026-10" currency="DOP" onClose={vi.fn()} onSaved={vi.fn()} />);
  expect(screen.getByRole("dialog")).toHaveTextContent("no sus gastos");
  expect(screen.queryByLabelText("Límite mensual")).not.toBeInTheDocument();
});
it("keeps legacy budgets accessible from the monthly overview", () => {
  render(<PlansScreen data={{ plans: [], count: 0 }} filters={{ month: "", status: "all", page: 1 }} month="2026-09" currency="DOP" />);
  expect(screen.getByRole("link", { name: "Ver límites individuales" })).toHaveAttribute("href", "/budgets?view=individual&month=&status=all");
});
