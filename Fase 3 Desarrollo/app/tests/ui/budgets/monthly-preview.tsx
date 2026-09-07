import { AppShell } from "@/components/app-shell";
import { PlanWorkspace } from "@/modules/budgets/plans/components/plan-workspace";
import { PlansScreen } from "@/modules/budgets/plans/components/plans-screen";
import type { PlanDetail } from "@/modules/budgets/plans/model";
import type { Category } from "@/modules/categories/model";
const names = ["Gimnasio y Salud", "Alimentación", "Transporte", "Personal y Universidad"];
const amounts = ["3000", "9500", "6000", "4000"];
const colors = ["#7CC7E7", "#16A085", "#EAC45B", "#E65454"];
const categories: Category[] = names.map((name, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, name, categoryType: "expense", isActive: true, isDefault: true, revision: "2026-09-01T00:00:00Z", icon: ["heart-pulse", "utensils", "bus", "graduation-cap"][i], color: colors[i] }));
const detail: PlanDetail = { plan: { id: "10000000-0000-4000-8000-000000000001", name: "Presupuesto Septiembre 2026", month: "2026-09", currency: "DOP", amount: "25000", expectedIncome: "30000", periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "active", version: 1, allocated: "22500", spent: "6200", categorySpent: "5800", categoryCount: 4 }, timezone: "America/Santo_Domingo",
  budgets: categories.map((c, i) => ({ id: `20000000-0000-4000-8000-00000000000${i}`, name: c.name, categoryId: c.id, categoryName: c.name, categoryIcon: c.icon, categoryColor: c.color, categoryActive: true, amount: amounts[i], spent: ["1500", "1800", "2000", "500"][i], currency: "DOP", periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "active", revision: "2026-09-01T00:00:00Z" })) };
export function MonthlyPreview() {
  const overview = new URLSearchParams(window.location.search).get("screen") === "overview";
  return <AppShell active="/budgets" name="Cuenta de prueba">{overview ? <PlansScreen data={{ plans: [detail.plan], count: 1 }} filters={{ month: "2026-09", status: "active", page: 1 }} month="2026-09" currency="DOP" /> : <PlanWorkspace detail={detail} categories={categories} />}</AppShell>;
}
