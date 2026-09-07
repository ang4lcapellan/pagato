import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CashFlow } from "./dashboard-charts";
import { bucketLabel, type DashboardRange } from "../model";
import { formatMoney } from "@/modules/accounts/model";

it.each([
  { bucket: "day", currency: "DOP", income: "0", expense: "125.0001" },
  { bucket: "week", currency: "USD", income: "1000", expense: "0" },
  { bucket: "month", currency: "EUR", income: "999999999999999.9999", expense: "123.45" },
] as const)("preserves SVG title text and DOM when hydrating $bucket / $currency", async ({ bucket, currency, income, expense }) => {
  const range: DashboardRange = { from: "2026-09-01", to: "2026-09-30", bucket };
  const trend = [{ date: "2026-09-01", income, expense }, { date: "2026-09-08", income: "0", expense: "0" }];
  const element = <CashFlow trend={trend} range={range} currency={currency} />;
  const container = document.createElement("div");
  const recoverableError = vi.fn();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    container.innerHTML = renderToString(element);
    document.body.append(container);
    const originalSvg = container.querySelector("svg");
    const expected = trend.map(p => `${bucketLabel(p.date, bucket)}: ingresos ${formatMoney(p.income, currency)}, gastos ${formatMoney(p.expense, currency)}`);
    expect([...container.querySelectorAll("svg title")].map(n => n.textContent)).toEqual(expected);
    await act(async () => { root = hydrateRoot(container, element, { onRecoverableError: recoverableError }); });
    expect(recoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(container.querySelector("svg")).toBe(originalSvg);
    expect([...container.querySelectorAll("svg title")].map(n => n.textContent)).toEqual(expected);
  } finally {
    if (root) await act(async () => root!.unmount());
    container.remove(); consoleError.mockRestore();
  }
});
