import { z } from "zod";
import { CURRENCIES, fromUnits, toUnits } from "../accounts/model";

const date = z.iso.date("Indica una fecha válida.").refine(v => v >= "0001-01-01", "Indica una fecha válida.");
export const budgetInputSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Escribe un nombre.").max(100, "Máximo 100 caracteres."),
  categoryId: z.uuid("Selecciona una categoría de gasto."),
  currency: z.enum(Object.keys(CURRENCIES) as [keyof typeof CURRENCIES, ...(keyof typeof CURRENCIES)[]]),
  amount: z.string().trim().max(20).transform(v => v.replace(",", "."))
    .refine(v => /^\d{1,15}(?:\.\d{1,4})?$/.test(v) && /[1-9]/.test(v), "Escribe un monto mayor que cero, sin separadores de miles y con hasta 4 decimales."),
  periodStart: date, periodEnd: date,
}).refine(v => v.periodStart <= v.periodEnd, { path: ["periodEnd"], message: "La fecha final no puede ser anterior a la inicial." });
export const budgetRevisionSchema = z.object({ id: z.uuid(), revision: z.iso.datetime({ offset: true }) });
export const budgetStatusSchema = budgetRevisionSchema.extend({ status: z.enum(["active", "archived"]) });
export const budgetFiltersSchema = z.object({
  month: z.union([z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(v => v >= "0001-01"), z.literal("")]),
  status: z.enum(["active", "archived", "all"]).default("active"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export const BUDGET_PAGE_SIZE = 12;
export type BudgetInput = z.output<typeof budgetInputSchema>;
export type BudgetFilters = z.output<typeof budgetFiltersSchema>;
export type Budget = BudgetInput & {
  status: "active" | "archived"; revision: string; spent: string;
  categoryName: string; categoryIcon: string | null; categoryColor: string | null; categoryActive: boolean;
};
export type BudgetSummary = { currency: string; amount: string; spent: string; count: number };
export type BudgetList = { budgets: Budget[]; totals: BudgetSummary[]; count: number; timezone: string };
export type BudgetActionState = { status: "idle" | "success" | "error"; message?: string; fields?: Record<string, string[]> };
export const initialBudgetState: BudgetActionState = { status: "idle" };

// Exact arithmetic even above Number.MAX_SAFE_INTEGER; only the bounded visual bar uses Number.
export function budgetProgress(amount: string, spent: string) {
  const limit = toUnits(amount), used = toUnits(spent);
  const remaining = limit - used;
  const percentHundredths = (used * BigInt(10000) + limit / BigInt(2)) / limit;
  return {
    available: fromUnits(remaining > BigInt(0) ? remaining : BigInt(0)),
    excess: fromUnits(remaining < BigInt(0) ? -remaining : BigInt(0)),
    percent: `${percentHundredths / BigInt(100)}.${(percentHundredths % BigInt(100)).toString().padStart(2, "0")}`,
    bar: Number(percentHundredths > BigInt(10000) ? BigInt(10000) : percentHundredths) / 100,
    level: used >= limit ? "exceeded" : used * BigInt(5) >= limit * BigInt(4) ? "warning" : "healthy",
    label: used > limit ? "Límite superado" : used === limit ? "Límite alcanzado" : used * BigInt(5) >= limit * BigInt(4) ? "Cerca del límite" : "Dentro del límite",
  };
}
export function monthPeriod(month: string) {
  const [year, value] = month.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][value - 1];
  return { periodStart: `${month}-01`, periodEnd: `${month}-${days}` };
}
export function formatBudgetDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}
export function budgetsUrl(filters: BudgetFilters, page = 1): `/budgets?${string}` {
  return `/budgets?${new URLSearchParams({ month: filters.month, status: filters.status, page: String(page) })}`;
}
