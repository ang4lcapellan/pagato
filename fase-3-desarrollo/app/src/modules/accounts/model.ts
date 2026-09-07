import { z } from "zod";

export const ACCOUNT_TYPES = {
  cash: "Efectivo", bank: "Cuenta bancaria", savings: "Ahorros",
  credit_card: "Tarjeta de crédito", digital_wallet: "Billetera digital",
  investment: "Inversión", other: "Otra cuenta",
} as const;
export const CURRENCIES = { DOP: "Peso dominicano", USD: "Dólar estadounidense", EUR: "Euro", CAD: "Dólar canadiense", MXN: "Peso mexicano", COP: "Peso colombiano" } as const;
export const ACCOUNT_COLORS = ["#0B6B58", "#16A085", "#3B6F68", "#586F9D", "#88699F", "#AA6940"] as const;
export type AccountType = keyof typeof ACCOUNT_TYPES;

// Money stays decimal text in forms/DTOs and numeric(19,4) in PostgreSQL.
const amountSchema = z.string().trim().max(21).transform((v) => v.replace(",", "."))
  .refine((v) => /^-?\d{1,15}(?:\.\d{1,4})?$/.test(v), "Usa un número sin separadores de miles y con hasta 4 decimales.");
const revisionSchema = z.iso.datetime({ offset: true });
export const accountInputSchema = z.object({
  id: z.uuid("El identificador no es válido."),
  name: z.string().trim().min(1, "Escribe un nombre para la cuenta.").max(100, "Máximo 100 caracteres."),
  accountType: z.enum(Object.keys(ACCOUNT_TYPES) as [AccountType, ...AccountType[]]),
  currency: z.enum(Object.keys(CURRENCIES) as [keyof typeof CURRENCIES, ...(keyof typeof CURRENCIES)[]]),
  openingBalance: amountSchema,
  creditLimit: z.union([z.literal(""), amountSchema]).transform((v) => v === "" ? null : v)
    .refine((v) => v === null || !v.startsWith("-"), "El límite no puede ser negativo."),
  institution: z.string().trim().max(120, "Máximo 120 caracteres."),
  description: z.string().trim().max(500, "Máximo 500 caracteres."),
  color: z.enum(ACCOUNT_COLORS),
}).transform((v) => ({ ...v, creditLimit: v.accountType === "credit_card" ? v.creditLimit : null }));
export const accountRevisionSchema = z.object({ id: z.uuid(), revision: revisionSchema });
export const accountStatusSchema = accountRevisionSchema.extend({ status: z.enum(["active", "archived"]) });
export type AccountInput = z.output<typeof accountInputSchema>;
export type FinancialAccount = {
  id: string; name: string; accountType: AccountType; currency: string;
  openingBalance: string; balance: string; creditLimit: string | null;
  institution: string | null; description: string | null; color: string | null;
  status: "active" | "archived"; revision: string; hasTransactions: boolean;
};
export type AccountActionState = { status: "idle" | "success" | "error"; message?: string; fields?: Record<string, string[]> };
export const initialAccountState: AccountActionState = { status: "idle" };

export function toUnits(value: string): bigint {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const units = BigInt(whole) * BigInt(10000) + BigInt(fraction.padEnd(4, "0"));
  return negative ? -units : units;
}
export function fromUnits(value: bigint): string {
  const absolute = value < BigInt(0) ? -value : value;
  return `${value < BigInt(0) ? "-" : ""}${absolute / BigInt(10000)}.${(absolute % BigInt(10000)).toString().padStart(4, "0")}`;
}
export function formatMoney(value: string, currency: string): string {
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const digits = fraction.replace(/0+$/, "").padEnd(2, "0");
  const parts = new Intl.NumberFormat("es-DO", { style: "currency", currency, minimumFractionDigits: 2 }).formatToParts(BigInt(whole));
  const amount = parts.map((part) => part.type === "fraction" ? digits : part.value).join("");
  return `${toUnits(value) < BigInt(0) ? "-" : ""}${amount}`;
}
export function totalsByCurrency(accounts: FinancialAccount[]) {
  const totals = new Map<string, bigint>();
  for (const account of accounts) if (account.status === "active") totals.set(account.currency, (totals.get(account.currency) ?? BigInt(0)) + toUnits(account.balance));
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => ({ currency, amount: fromUnits(amount) }));
}
