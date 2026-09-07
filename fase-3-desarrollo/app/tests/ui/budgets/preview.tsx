import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@/app/globals.css";
import { AppShell } from "@/components/app-shell";
import { BudgetsScreen } from "@/modules/budgets/components/budgets-screen";
import type { Budget, BudgetList } from "@/modules/budgets/model";
import type { Category } from "@/modules/categories/model";
import { MonthlyPreview } from "./monthly-preview";
const names = ["Alimentación", "Transporte", "Servicios", "Entretenimiento", "Salud", "Compras"];
const categories: Category[] = names.map((name, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, name, categoryType: "expense", isActive: true, isDefault: true, revision: "2026-09-01T00:00:00Z", icon: ["utensils", "bus", "receipt", "popcorn", "heart-pulse", "ellipsis"][i], color: "#16A085" }));
const budgets: Budget[] = categories.map((c, i) => ({ id: `10000000-0000-4000-8000-00000000000${i}`, name: c.name, categoryId: c.id, categoryName: c.name, categoryIcon: c.icon, categoryColor: c.color, categoryActive: true,
  currency: "DOP", amount: "1000", spent: ["690", "830", "1100", "0", "480", "999.9999"][i], periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "active", revision: "2026-09-01T00:00:00Z" }));
const data: BudgetList = { budgets, totals: [{ currency: "DOP", amount: "6000", spent: "4099.9999", count: 6 }], count: 6, timezone: "America/Santo_Domingo" };
createRoot(document.getElementById("root")!).render(new URLSearchParams(window.location.search).has("monthly") ? <MonthlyPreview /> : <AppShell active="/budgets" name="Cuenta de prueba"><BudgetsScreen data={data} categories={categories} filters={{ month: "2026-09", status: "active", page: 1 }} currentMonth="2026-09" currency="DOP" /></AppShell>);
