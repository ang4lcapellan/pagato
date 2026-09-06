import { describe, expect, it } from "vitest";
import { bucketLabel, chartRatio, dashboardFiltersSchema, dashboardMetrics, dashboardRange, dashboardUrl, defaultDashboardFilters, formatDate, safeTimezone } from "./model";
const defaults = defaultDashboardFilters("DOP", "America/Santo_Domingo", new Date("2026-09-03T12:00Z"));
describe("dashboard filters", () => {
  it("defaults to the profile timezone, not UTC or the browser", () => {
    expect(defaultDashboardFilters("USD", "America/Santo_Domingo", new Date("2026-10-01T02:00Z")).month).toBe("2026-09");
    expect(safeTimezone("not/a-zone")).toBe("UTC");
  });
  it("uses leap month and whole-year boundaries", () => {
    expect(dashboardRange({ ...defaults, month: "2028-02" })).toEqual({ from: "2028-02-01", to: "2028-02-29", bucket: "week" });
    expect(dashboardRange({ ...defaults, period: "year", year: "2028" })).toEqual({ from: "2028-01-01", to: "2028-12-31", bucket: "month" });
  });
  it.each([
    { currency: ["USD", "DOP"] }, { currency: "usd" }, { month: "2026-13" }, { year: "0000" },
    { period: "custom", from: "2026-02-30", to: "2026-03-01" },
    { period: "custom", from: "2026-09-02", to: "2026-09-01" },
    { period: "custom", from: "2025-01-01", to: "2026-01-02" }, { period: "custom" },
  ])("rejects invalid or unbounded filters %j", value => expect(dashboardFiltersSchema.safeParse({ ...defaults, ...value }).success).toBe(false));
  it("accepts a 366-day range, a single day and weekly ranges", () => {
    expect(dashboardFiltersSchema.safeParse({ ...defaults, period: "custom", from: "2028-01-01", to: "2028-12-31" }).success).toBe(true);
    expect(dashboardRange({ ...defaults, period: "custom", from: "2026-09-01", to: "2026-09-01" }).bucket).toBe("day");
    expect(dashboardRange({ ...defaults, period: "custom", from: "2026-09-01", to: "2026-10-31" }).bucket).toBe("week");
  });
  it("keeps the applied period and currency in the URL", () => expect(dashboardUrl(defaults)).toContain("currency=DOP"));
});
describe("exact financial metrics", () => {
  it("separates net, savings, deficit and rate", () => {
    expect(dashboardMetrics("30000", "22500")).toEqual({ net: "7500.0000", savings: "7500.0000", deficit: "0.0000", rate: "25,00%" });
    expect(dashboardMetrics("100", "150")).toEqual({ net: "-50.0000", savings: "0.0000", deficit: "50.0000", rate: "-50,00%" });
    expect(dashboardMetrics("0", "25").rate).toBeNull();
  });
  it("does not lose fractions above Number.MAX_SAFE_INTEGER", () => {
    expect(dashboardMetrics("99999999999999999.0001", "99999999999999999.0000").savings).toBe("0.0001");
  });
  it("uses approximate numbers only for chart coordinates", () => {
    expect(chartRatio("250", "1000")).toBe(25);
    expect(chartRatio("0", "0")).toBe(0);
    expect(chartRatio("0.0001", "0.0002")).toBe(50);
    expect(formatDate("2026-09-03T12:00")).toBe("03/09/2026");
    expect(bucketLabel("2026-09-01", "month")).toBe("Sep");
  });
});
