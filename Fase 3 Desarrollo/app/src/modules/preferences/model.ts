import { z } from "zod";
import { CURRENCIES, formatMoney } from "@/modules/accounts/model";

export const DEFAULT_PREFERENCES = { theme: "system", locale: "es", baseCurrency: "DOP", timezone: "America/Santo_Domingo", dateFormat: "DD/MM/YYYY", numberFormat: "comma-dot" } as const;
export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export function isTimezone(value: string) { try { new Intl.DateTimeFormat("en", { timeZone: value }).format(0); return true; } catch { return false; } }
export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]), locale: z.enum(["es", "en"]),
  baseCurrency: z.enum(Object.keys(CURRENCIES) as [keyof typeof CURRENCIES, ...(keyof typeof CURRENCIES)[]]),
  timezone: z.string().trim().min(1).max(64).refine(isTimezone, "Selecciona una zona horaria válida."),
  dateFormat: z.enum(DATE_FORMATS), numberFormat: z.enum(["comma-dot", "dot-comma"]),
});
export const preferenceRevision = z.iso.datetime({ offset: true });
export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferenceRecord = { preferences: Preferences; revision: string };
export type PreferencesState = { status: "idle" | "success" | "error"; message?: string; fields?: Record<string, string[]>; record?: PreferenceRecord };
export const initialPreferencesState: PreferencesState = { status: "idle" };
export function formatPreferenceDate(value: string, format: Preferences["dateFormat"]) {
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return format === "YYYY-MM-DD" ? `${y}-${m}-${d}` : format === "MM/DD/YYYY" ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}
export function formatPreferenceNumber(value: string | number, format: Preferences["numberFormat"]) {
  const raw = String(value), negative = raw.startsWith("-");
  const [integer, fraction] = raw.replace(/^-/, "").split(".");
  if (!/^\d+$/.test(integer) || (fraction !== undefined && !/^\d*$/.test(fraction))) return raw;
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, format === "comma-dot" ? "," : ".");
  return `${negative ? "-" : ""}${grouped}${fraction === undefined ? "" : `${format === "comma-dot" ? "." : ","}${fraction}`}`;
}
export function preferenceMoney(value: string, currency: string, format: Preferences["numberFormat"]) {
  const formatted = formatMoney(value, currency);
  return format === "comma-dot" ? formatted : formatted.replace(/[.,]/g, char => char === "." ? "," : ".");
}
