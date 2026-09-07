import { z } from "zod";
import { fromUnits, toUnits } from "../accounts/model";
import { monthPeriod } from "../budgets/model";
import type { Transaction } from "../transactions/model";

const date = z.iso.date().refine(v => v >= "0001-01-01");
const optionalDate = z.union([date, z.literal("")]).default("");
export const dashboardFiltersSchema = z.object({
  period: z.enum(["month", "year", "custom"]).default("month"),
  currency: z.string().regex(/^[A-Z]{3}$/),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(v => v >= "0001-01"),
  year: z.string().regex(/^\d{4}$/).refine(v => v >= "0001"),
  from: optionalDate,
  to: optionalDate,
}).superRefine((v, ctx) => {
  if (v.period !== "custom") return;
  if (!v.from || !v.to || v.from > v.to || dayDistance(v.from, v.to) > 365) {
    ctx.addIssue({ code: "custom", path: ["from"], message: "Selecciona un rango válido de hasta 366 días." });
  }
});
export type DashboardFilters = z.output<typeof dashboardFiltersSchema>;
export type DashboardRange = { from: string; to: string; bucket: "day" | "week" | "month" };
export type CashPoint = { date: string; income: string; expense: string };
export type ExpenseSlice = { id: string; name: string; color: string | null; amount: string; count: number };
export type DashboardBudget = { id: string; kind: "monthly" | "individual"; name: string; amount: string; spent: string; periodStart: string; periodEnd: string };
export type DashboardData = {
  timezone: string; refreshedAt: string; currencies: string[];
  balance: string; accountCount: number; income: string; expense: string; movementCount: number;
  trend: CashPoint[]; distribution: ExpenseSlice[]; recent: Transaction[];
  budgets: DashboardBudget[]; budgetCount: number;
};

function dayDistance(from: string, to: string) { return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000; }
export function dashboardRange(filters: DashboardFilters): DashboardRange {
  const dates = filters.period === "month" ? monthPeriod(filters.month)
    : filters.period === "year" ? { periodStart: `${filters.year}-01-01`, periodEnd: `${filters.year}-12-31` }
      : { periodStart: filters.from, periodEnd: filters.to };
  const days = dayDistance(dates.periodStart, dates.periodEnd) + 1;
  return { from: dates.periodStart, to: dates.periodEnd, bucket: days > 62 ? "month" : days > 14 ? "week" : "day" };
}
export function safeTimezone(value: string) {
  try { new Intl.DateTimeFormat("es", { timeZone: value }).format(); return value; } catch { return "UTC"; }
}
export function defaultDashboardFilters(currency: string, timezone: string, now = new Date()): DashboardFilters {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: safeTimezone(timezone), year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = parts.find(p => p.type === "year")!.value.padStart(4, "0");
  const month = `${year}-${parts.find(p => p.type === "month")!.value}`;
  return { currency: /^[A-Z]{3}$/.test(currency) ? currency : "DOP", month, year, period: "month", from: "", to: "" };
}
export function dashboardMetrics(income: string, expense: string) {
  const earned = toUnits(income), net = earned - toUnits(expense);
  const rate = earned > BigInt(0) ? net * BigInt(10000) / earned : null;
  const absolute = rate === null ? null : rate < BigInt(0) ? -rate : rate;
  return { net: fromUnits(net), savings: fromUnits(net > BigInt(0) ? net : BigInt(0)), deficit: fromUnits(net < BigInt(0) ? -net : BigInt(0)),
    rate: absolute === null ? null : `${rate! < BigInt(0) ? "-" : ""}${absolute / BigInt(100)},${String(absolute % BigInt(100)).padStart(2, "0")}%` };
}
// Numbers are used only for bounded visual coordinates; monetary values remain exact.
export function chartRatio(value: string, total: string) {
  const units = toUnits(total);
  return units > BigInt(0) ? Number(toUnits(value) * BigInt(10000) / units) / 100 : 0;
}
export function periodLabel(range: DashboardRange) { return `${formatDate(range.from)} — ${formatDate(range.to)}`; }
export function formatDate(date: string) { const [y, m, d] = date.slice(0, 10).split("-"); return `${d}/${m}/${y}`; }
export function bucketLabel(date: string, bucket: DashboardRange["bucket"]) {
  if (bucket === "month") return ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][Number(date.slice(5, 7)) - 1];
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}
export function dashboardUrl(filters: DashboardFilters): `/dashboard?${string}` { return `/dashboard?${new URLSearchParams(filters)}`; }
