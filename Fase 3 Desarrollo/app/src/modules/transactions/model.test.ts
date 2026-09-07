import { describe, expect, it } from "vitest";
import { historyUrl, localDateTime, transactionFiltersSchema, transactionInputSchema, transactionVersionSchema } from "./model";
const source = "af8155c9-9b4d-49a6-b15c-7683b9ec4141";
const destination = "41edecb9-62ea-4c9f-a5a9-243a75284d91";
const base = { id: "3cfde5cf-efef-4cb2-87dd-c9219c8e3f36", type: "expense", sourceAccountId: source, sourceCurrency: "DOP", destinationCurrency: "DOP", categoryId: source, amount: "10.25", occurredLocal: "2026-09-02T14:30" };
describe("transaction validation", () => {
  it("retains exact decimal amounts and strips forged ownership", () => {
    expect(transactionInputSchema.parse({ ...base, amount: "999999999999999,1234", user_id: "forged", version: 99 })).toMatchObject({ sourceAmount: "999999999999999.1234", destinationAmount: null });
    expect(transactionInputSchema.parse({ ...base, user_id: "forged" })).not.toHaveProperty("user_id");
  });
  it.each(["0", "0.0000", "-1", "1e3", "NaN", "Infinity", "1,000.00", "1.23456", "1000000000000000"])("rejects invalid amount %s", amount => {
    expect(transactionInputSchema.safeParse({ ...base, amount }).success).toBe(false);
  });
  it("maps income and transfer without ghost category/account data", () => {
    expect(transactionInputSchema.parse({ ...base, type: "income", destinationAccountId: destination })).toMatchObject({ sourceAccountId: null, sourceAmount: null, destinationAmount: "10.25" });
    expect(transactionInputSchema.parse({ ...base, type: "transfer", destinationAccountId: destination, receivedAmount: "2" })).toMatchObject({ categoryId: null, sourceAmount: "10.25", destinationAmount: "2" });
  });
  it("requires separate transfer accounts and received amount", () => {
    expect(transactionInputSchema.safeParse({ ...base, type: "transfer", destinationAccountId: source, receivedAmount: "10" }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...base, type: "transfer", destinationAccountId: destination }).success).toBe(false);
  });
  it("requires income account and matching non-transfer category", () => {
    expect(transactionInputSchema.safeParse({ ...base, type: "income" }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...base, categoryId: "" }).success).toBe(false);
  });
  it.each(["2026-02-30T12:30", "2026-09-02T24:01", "2026-09-02T12:61", "2026-09-02T12:00Z"])("rejects invalid local date %s", occurredLocal => {
    expect(transactionInputSchema.safeParse({ ...base, occurredLocal }).success).toBe(false);
  });
  it("rejects overlong text, negative versions and reversed ranges", () => {
    expect(transactionInputSchema.safeParse({ ...base, notes: "x".repeat(1001) }).success).toBe(false);
    expect(transactionVersionSchema.safeParse({ id: base.id, version: 0 }).success).toBe(false);
    expect(transactionFiltersSchema.safeParse({ from: "2026-09-03", to: "2026-09-02" }).success).toBe(false);
    expect(transactionFiltersSchema.safeParse({ page: "1;delete" }).success).toBe(false);
  });
  it("uses the profile timezone instead of server timezone", () => {
    expect(localDateTime(new Date("2026-09-02T02:15:00Z"), "America/Santo_Domingo")).toBe("2026-09-01T22:15");
  });
  it("encodes search and preserves filters across pages", () => {
    const url = historyUrl(transactionFiltersSchema.parse({ q: "comida & café", type: "expense", account: source }), 2);
    expect(new URL(url, "http://localhost").searchParams.get("q")).toBe("comida & café");
    expect(url).toContain("page=2");
    expect(url).toContain(`account=${source}`);
  });
});
