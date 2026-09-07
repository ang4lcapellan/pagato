import { z } from "zod";

export const TRANSACTION_TYPES = { expense: "Gasto", income: "Ingreso", transfer: "Transferencia" } as const;
export type TransactionType = keyof typeof TRANSACTION_TYPES;
const optionalId = z.union([z.uuid(), z.literal("")]).default("");
const money = z.string().trim().max(20).transform(v => v.replace(",", "."))
  .refine(v => /^\d{1,15}(?:\.\d{1,4})?$/.test(v) && /[1-9]/.test(v), "Escribe un monto mayor que cero, sin separadores de miles y con hasta 4 decimales.");
const localTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Indica una fecha y hora válidas.")
  .refine(v => z.iso.date().safeParse(v.slice(0, 10)).success && Number(v.slice(11, 13)) < 24 && Number(v.slice(14)) < 60, "Indica una fecha y hora válidas.");

export const transactionInputSchema = z.object({
  id: z.uuid(), type: z.enum(["expense", "income", "transfer"]),
  sourceAccountId: optionalId, destinationAccountId: optionalId, categoryId: optionalId,
  sourceCurrency: z.union([z.string().regex(/^[A-Z]{3}$/), z.literal("")]).default(""),
  destinationCurrency: z.union([z.string().regex(/^[A-Z]{3}$/), z.literal("")]).default(""),
  amount: money, receivedAmount: z.union([money, z.literal("")]).default(""),
  occurredLocal: localTime,
  description: z.string().trim().max(240, "Máximo 240 caracteres.").default(""),
  notes: z.string().trim().max(1000, "Máximo 1000 caracteres.").default(""),
  paymentMethod: z.string().trim().max(50, "Máximo 50 caracteres.").default(""),
}).superRefine((v, ctx) => {
  const issue = (field: string, message: string) => ctx.addIssue({ code: "custom", path: [field], message });
  if (v.type !== "income" && !v.sourceAccountId) issue("sourceAccountId", "Selecciona la cuenta de origen.");
  if (v.type !== "income" && !v.sourceCurrency) issue("sourceAccountId", "Selecciona una cuenta con moneda válida.");
  if (v.type !== "expense" && !v.destinationAccountId) issue("destinationAccountId", "Selecciona la cuenta de destino.");
  if (v.type !== "expense" && !v.destinationCurrency) issue("destinationAccountId", "Selecciona una cuenta con moneda válida.");
  if (v.type !== "transfer" && !v.categoryId) issue("categoryId", "Selecciona una categoría.");
  if (v.type === "transfer" && v.sourceAccountId === v.destinationAccountId) issue("destinationAccountId", "Elige una cuenta diferente a la de origen.");
  if (v.type === "transfer" && !v.receivedAmount) issue("receivedAmount", "Indica el importe recibido.");
}).transform(v => ({ ...v,
  sourceAccountId: v.type === "income" ? null : v.sourceAccountId,
  destinationAccountId: v.type === "expense" ? null : v.destinationAccountId,
  categoryId: v.type === "transfer" ? null : v.categoryId,
  sourceAmount: v.type === "income" ? null : v.amount,
  destinationAmount: v.type === "expense" ? null : v.type === "income" ? v.amount : v.receivedAmount,
}));
export type TransactionInput = z.output<typeof transactionInputSchema>;
export const transactionVersionSchema = z.object({ id: z.uuid(), version: z.coerce.number().int().min(1).max(2147483646) });
const optionalDate = z.union([z.iso.date(), z.literal("")]).default("");
export const transactionFiltersSchema = z.object({
  q: z.string().trim().max(240).default(""), type: z.enum(["all", "expense", "income", "transfer"]).default("all"),
  account: optionalId, category: optionalId, from: optionalDate, to: optionalDate,
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).refine(v => !v.from || !v.to || v.from <= v.to, "La fecha inicial no puede ser posterior a la final.");
export type TransactionFilters = z.output<typeof transactionFiltersSchema>;
export const PAGE_SIZE = 20;
export type Transaction = {
  id: string; type: TransactionType; sourceAccountId: string | null; destinationAccountId: string | null;
  sourceName: string | null; destinationName: string | null; sourceCurrency: string | null; destinationCurrency: string | null;
  sourceAmount: string | null; destinationAmount: string | null; categoryId: string | null; categoryName: string | null;
  categoryIcon: string | null; categoryColor: string | null; occurredLocal: string; description: string | null;
  notes: string | null; paymentMethod: string | null; version: number;
};
export type TransactionHistory = { transactions: Transaction[]; count: number; totals: { currency: string; income: string; expense: string; net: string }[]; timezone: string };
export type TransactionActionState = { status: "idle" | "success" | "error"; message?: string; fields?: Record<string, string[]> };
export const initialTransactionState: TransactionActionState = { status: "idle" };
export function localDateTime(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (name: string) => parts.find(p => p.type === name)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function historyUrl(filters: TransactionFilters, page: number): `/transactions?${string}` {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, page })) if (value !== "" && value !== "all") params.set(key, String(value));
  return `/transactions?${params.toString()}`;
}
