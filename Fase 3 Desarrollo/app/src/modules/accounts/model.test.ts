// @vitest-environment node
import { describe, expect, it } from "vitest";
import { accountInputSchema, formatMoney, fromUnits, toUnits, totalsByCurrency, type FinancialAccount } from "./model";

const input = { id: "0955bc09-14f2-4341-99d7-7711bba0f168", name: "Efectivo", accountType: "cash", currency: "DOP", openingBalance: "100.25", creditLimit: "", institution: "", description: "", color: "#0B6B58" };
describe("account validation", () => {
  it("valida datos y acepta coma decimal sin usar flotantes", () => {
    expect(accountInputSchema.parse({ ...input, openingBalance: "10,1234" })).toMatchObject({ openingBalance: "10.1234", creditLimit: null });
    expect(accountInputSchema.parse({ ...input, openingBalance: "-500" }).openingBalance).toBe("-500");
  });
  it.each(["", "NaN", "Infinity", "1e5", "1.12345", "1000000000000000", "1,234.56", "0x10"])("rechaza saldo inválido %s", (openingBalance) => {
    expect(accountInputSchema.safeParse({ ...input, openingBalance }).success).toBe(false);
  });
  it("rechaza nombre vacío, tipo desconocido, moneda arbitraria y límite negativo", () => {
    for (const extra of [{ name: "  " }, { accountType: "admin" }, { currency: "ZZZ" }, { creditLimit: "-10" }, { id: "not-an-id" }, { color: "url(javascript:x)" }]) expect(accountInputSchema.safeParse({ ...input, ...extra }).success).toBe(false);
  });
  it("no acepta el propietario enviado por el navegador", () => {
    expect(accountInputSchema.parse({ ...input, user_id: "other-user" })).not.toHaveProperty("user_id");
  });
});
describe("exact money", () => {
  it("preserva los cuatro decimales y los límites de numeric(19,4)", () => {
    for (const value of ["999999999999999.9999", "-0.0001", "0.3000"]) expect(fromUnits(toUnits(value))).toBe(value);
    expect(fromUnits(toUnits("0.1") + toUnits("0.2"))).toBe("0.3000");
    expect(formatMoney("999999999999999.9999", "USD")).toContain("999,999,999,999,999.9999");
    expect(formatMoney("-0.0001", "DOP")).toContain("-RD$0.0001");
  });
  it("suma por moneda y excluye las cuentas archivadas", () => {
    const accounts = [{ currency: "DOP", balance: "10.1234", status: "active" }, { currency: "DOP", balance: "-5.1234", status: "active" }, { currency: "USD", balance: "20", status: "active" }, { currency: "DOP", balance: "100", status: "archived" }] as FinancialAccount[];
    expect(totalsByCurrency(accounts)).toEqual([{ currency: "DOP", amount: "5.0000" }, { currency: "USD", amount: "20.0000" }]);
  });
});
