import { expect, it } from "vitest";
import { budgetFiltersSchema, budgetInputSchema, budgetProgress, budgetsUrl, monthPeriod } from "./model";
const input = { id: "ae4c895a-1d84-4ed2-bd80-5b893d0fd12a", name: "Alimentos", categoryId: "3bc26551-c4f6-4f45-8c29-598a3868ba4c", currency: "DOP", amount: "1000", periodStart: "2026-09-01", periodEnd: "2026-09-30" };
it("accepts positive exact money, decimal comma and inclusive single-day periods", () => {
  expect(budgetInputSchema.parse({ ...input, amount: " 1,0001 ", periodEnd: input.periodStart }).amount).toBe("1.0001");
  expect(budgetInputSchema.parse({ ...input, amount: "999999999999999.9999" }).amount).toBe("999999999999999.9999");
});
it.each(["0", "0.0000", "-10", "NaN", "Infinity", "1e3", "1,000.00", "1.00001", "1000000000000000"])("rejects invalid limit %s", amount => {
  expect(budgetInputSchema.safeParse({ ...input, amount }).success).toBe(false);
});
it("rejects invalid dates, reversed periods, unsupported currencies and IDs", () => {
  for (const change of [{ periodStart: "2026-02-30" }, { periodEnd: "2025-09-30" }, { periodStart: "0000-01-01" }, { currency: "BAD" }, { categoryId: "" }, { name: " " }]) expect(budgetInputSchema.safeParse({ ...input, ...change }).success).toBe(false);
});
it("calculates exact progress, zero, warning, reached and exceeded", () => {
  expect(budgetProgress("100", "0")).toMatchObject({ available: "100.0000", percent: "0.00", level: "healthy" });
  expect(budgetProgress("100", "80")).toMatchObject({ available: "20.0000", percent: "80.00", level: "warning" });
  expect(budgetProgress("100", "100")).toMatchObject({ available: "0.0000", excess: "0.0000", label: "Límite alcanzado" });
  expect(budgetProgress("100", "150")).toMatchObject({ available: "0.0000", excess: "50.0000", percent: "150.00", bar: 100, label: "Límite superado" });
  expect(budgetProgress("0.0003", "0.0001")).toMatchObject({ available: "0.0002", percent: "33.33" });
});
it("does not truncate percentages or lose precision on large totals", () => {
  expect(budgetProgress("0.0001", "1").percent).toBe("1000000.00");
  expect(budgetProgress("999999999999999.9999", "999999999999999.9998").available).toBe("0.0001");
  expect(budgetProgress("1000000000000000", "2000000000000000").excess).toBe("1000000000000000.0000");
});
it("handles leap months, filters and pagination URLs", () => {
  expect(monthPeriod("2028-02").periodEnd).toBe("2028-02-29");
  expect(monthPeriod("2100-02").periodEnd).toBe("2100-02-28");
  expect(monthPeriod("2026-12").periodEnd).toBe("2026-12-31");
  expect(budgetFiltersSchema.safeParse({ month: "2026-13" }).success).toBe(false);
  expect(budgetFiltersSchema.safeParse({ month: "0000-01" }).success).toBe(false);
  expect(budgetFiltersSchema.safeParse({ month: "", page: "0" }).success).toBe(false);
  expect(budgetsUrl({ month: "", status: "all", page: 1 }, 2)).toBe("/budgets?month=&status=all&page=2");
});
