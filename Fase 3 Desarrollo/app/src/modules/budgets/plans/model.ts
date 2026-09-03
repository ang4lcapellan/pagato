import { z } from "zod";
import { CURRENCIES, fromUnits, toUnits } from "../../accounts/model";
import type { Budget } from "../model";
export const planMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Selecciona un mes válido.").refine(v => v >= "0001-01", "Selecciona un mes válido.");
const money = z.string().trim().max(20).transform(v => v.replace(",", "."))
  .refine(v => /^\d{1,15}(?:\.\d{1,4})?$/.test(v), "Usa un importe válido con hasta cuatro decimales.");
const positive = money.refine(v => /[1-9]/.test(v), "El importe debe ser mayor que cero.");
export const planSchema = z.object({
  id: z.uuid(), requestId: z.uuid(), mode: z.enum(["create", "edit"]),
  version: z.coerce.number().int().min(0).max(2147483646).default(0),
  name: z.string().trim().min(1, "Escribe un nombre.").max(100, "Máximo 100 caracteres."),
  month: planMonthSchema,
  currency: z.enum(Object.keys(CURRENCIES) as [keyof typeof CURRENCIES, ...(keyof typeof CURRENCIES)[]]),
  amount: positive, expectedIncome: z.union([money, z.literal("")]).default(""),
  allocations: z.array(z.object({ categoryId: z.uuid("Selecciona una categoría."), amount: positive })).max(100, "Máximo 100 categorías."),
}).superRefine((v, ctx) => {
  if (v.mode === "edit" && v.version < 1) ctx.addIssue({ code: "custom", path: ["version"], message: "Actualiza el presupuesto antes de guardar." });
  if (new Set(v.allocations.map(a => a.categoryId)).size !== v.allocations.length) ctx.addIssue({ code: "custom", path: ["allocations"], message: "No repitas una categoría." });
  // Refinements run even if individual amounts are invalid; only calculate validated money.
  if (positive.safeParse(v.amount).success && v.allocations.every(a => positive.safeParse(a.amount).success)
    && v.allocations.reduce((sum, a) => sum + toUnits(a.amount), BigInt(0)) > toUnits(v.amount)) {
    ctx.addIssue({ code: "custom", path: ["allocations"], message: "La suma de categorías supera el límite mensual. Reduce los importes o aumenta el límite." });
  }
});
export type PlanInput = z.output<typeof planSchema>;
export const copyPlanSchema = z.object({ id: z.uuid(), requestId: z.uuid(), sourceId: z.uuid(), sourceVersion: z.coerce.number().int().min(1).max(2147483646), month: planMonthSchema, name: z.string().trim().min(1).max(100) });
export const planStatusSchema = z.object({ id: z.uuid(), version: z.coerce.number().int().min(1).max(2147483646), status: z.enum(["active", "archived"]) });
export type Plan = {
  id: string; name: string; month: string; currency: string; amount: string; expectedIncome: string | null;
  periodStart: string; periodEnd: string; status: "active" | "archived"; version: number;
  allocated: string; spent: string; categorySpent: string; categoryCount: number;
};
export type PlanDetail = { plan: Plan; budgets: Budget[]; timezone: string };
export type PlanList = { plans: Plan[]; count: number };
export type PlanActionState = { status: "idle" | "success" | "error"; message?: string; fields?: Record<string, string[]>; id?: string; version?: number };
export const initialPlanState: PlanActionState = { status: "idle" };
export function monthlyName(month: string) {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `Presupuesto ${months[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
}
export function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
export function draftUnits(value: string): bigint {
  const parsed = money.safeParse(value);
  return parsed.success ? toUnits(parsed.data) : BigInt(0);
}
export function allocationSummary(amount: string, income: string, allocations: { amount: string }[]) {
  const limit = draftUnits(amount), planned = allocations.reduce((s, a) => s + draftUnits(a.amount), BigInt(0));
  const earnings = income.trim() === "" ? null : draftUnits(income);
  const savings = earnings === null ? null : earnings - planned;
  const rate = savings === null || earnings === null || earnings === BigInt(0) ? null : (savings * BigInt(10000)) / earnings;
  return { allocated: fromUnits(planned), remaining: fromUnits(limit - planned), over: planned > limit,
    savings: savings === null ? null : fromUnits(savings),
    savingsRate: rate === null ? null : `${rate < BigInt(0) ? "-" : ""}${(rate < BigInt(0) ? -rate : rate) / BigInt(100)}.${((rate < BigInt(0) ? -rate : rate) % BigInt(100)).toString().padStart(2, "0")}` };
}
export function rangeAmount(limit: string, position: number) {
  return fromUnits(draftUnits(limit) * BigInt(Math.max(0, Math.min(1000, Math.round(position)))) / BigInt(1000));
}
export function allocationWidth(amount: string, total: string) {
  const denominator = draftUnits(total);
  if (!denominator) return 0;
  const ratio = draftUnits(amount) * BigInt(10000) / denominator;
  return Number(ratio > BigInt(10000) ? BigInt(10000) : ratio) / 100;
}
export function planUrl(id: string): `/budgets/${string}` { return `/budgets/${id}`; }
