import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, preferencesSchema, formatPreferenceDate, formatPreferenceNumber, preferenceMoney } from "./model";
import { translate } from "./messages";
describe("preferences", () => {
  it("validates defaults and all supported options", () => {
    expect(preferencesSchema.parse(DEFAULT_PREFERENCES)).toEqual(DEFAULT_PREFERENCES);
    expect(preferencesSchema.parse({ ...DEFAULT_PREFERENCES, theme: "dark", locale: "en", baseCurrency: "USD", timezone: "Pacific/Auckland", dateFormat: "YYYY-MM-DD", numberFormat: "dot-comma" }).locale).toBe("en");
  });
  it.each([{ theme: "blue" }, { locale: "fr" }, { baseCurrency: "XXX" }, { timezone: "Mars/City" }, { dateFormat: "DD-MM" }, { numberFormat: "unknown" }])("rejects invalid settings %j", values => expect(preferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, ...values }).success).toBe(false));
  it.each([["DD/MM/YYYY", "23/09/2026"], ["MM/DD/YYYY", "09/23/2026"], ["YYYY-MM-DD", "2026-09-23"]] as const)("formats civil dates deterministically: %s", (format, expected) => expect(formatPreferenceDate("2026-09-23T00:01:00", format)).toBe(expected));
  it("preserves monetary precision beyond Number.MAX_SAFE_INTEGER", () => {
    expect(formatPreferenceNumber("999999999999999.0001", "dot-comma")).toBe("999.999.999.999.999,0001");
    expect(preferenceMoney("-12345.0001", "USD", "dot-comma")).toContain("12.345,0001");
    expect(preferenceMoney("12345.67", "DOP", "comma-dot")).toContain("12,345.67");
  });
  it("translates only requested application strings and preserves spaces", () => {
    expect(translate("en", " Hola, ")).toBe(" Hello, ");
    expect(translate("es", "Hola,")).toBe("Hola,");
    expect(translate("en", "My own account")).toBe("My own account");
  });
});
