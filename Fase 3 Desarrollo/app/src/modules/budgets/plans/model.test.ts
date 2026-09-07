import { expect, it } from "vitest";
import { allocationSummary, allocationWidth, monthlyName, nextMonth, planSchema, rangeAmount } from "./model";
const v = { id: "cd797829-be39-4138-a7ca-02c07bb53147", requestId: "c28892fe-13ce-4f87-857e-f68b14b100a3", mode: "create", name: "Mes", month: "2026-09", currency: "DOP", amount: "1000", expectedIncome: "1500", allocations: [{ categoryId: "9f8516bb-493c-489b-93ef-c0e844624055", amount: "800" }] };
it("accepts empty plans and partial distributions", () => { expect(planSchema.safeParse(v).success).toBe(true); expect(planSchema.safeParse({ ...v, allocations: [] }).success).toBe(true); });
it("rejects overallocated, duplicate, invalid and zero allocations", () => {
  for (const allocations of [[{ ...v.allocations[0], amount: "1000.0001" }], [...v.allocations, ...v.allocations], [{ ...v.allocations[0], amount: "0" }], [{ ...v.allocations[0], amount: "bad" }]]) expect(planSchema.safeParse({ ...v, allocations }).success).toBe(false);
});
it("validates month, limits, income and edit versions", () => {
  for (const change of [{ month: "0000-01" }, { month: "2026-13" }, { amount: "-1" }, { expectedIncome: "-1" }, { mode: "edit", version: 0 }]) expect(planSchema.safeParse({ ...v, ...change }).success).toBe(false);
});
it("computes projected savings separately from actual spending", () => {
  expect(allocationSummary("25000", "30000", [{ amount: "22500" }])).toMatchObject({ allocated: "22500.0000", remaining: "2500.0000", savings: "7500.0000", savingsRate: "25.00" });
  expect(allocationSummary("1000", "", [{ amount: "100" }]).savings).toBeNull();
  expect(allocationSummary("1000", "0", [{ amount: "100" }])).toMatchObject({ savings: "-100.0000", savingsRate: null });
  expect(allocationSummary("1000", "500", [{ amount: "1000" }]).savingsRate).toBe("-100.00");
});
it("keeps slider and currency math exact with huge amounts", () => {
  expect(rangeAmount("1000", 250)).toBe("250.0000");
  expect(rangeAmount("999999999999999.9999", 1000)).toBe("999999999999999.9999");
  expect(allocationWidth("250", "1000")).toBe(25);
  expect(allocationWidth("2000", "1000")).toBe(100);
  expect(allocationSummary("0.0003", "1", [{ amount: "0.0001" }, { amount: "0.0002" }]).remaining).toBe("0.0000");
});
it("names and rolls months across the year", () => { expect(monthlyName("2026-09")).toBe("Presupuesto Septiembre 2026"); expect(nextMonth("2026-12")).toBe("2027-01"); });
