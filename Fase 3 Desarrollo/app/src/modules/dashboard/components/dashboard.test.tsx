import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../server/actions", () => ({ loadDashboardOptionsAction: vi.fn() }));
vi.mock("@/modules/transactions/server/actions", () => ({ saveTransactionAction: vi.fn(), deleteTransactionAction: vi.fn() }));
import { DashboardScreen } from "./dashboard-screen";
import { DashboardLoading, DashboardUnavailable } from "./dashboard-states";
import { loadDashboardOptionsAction } from "../server/actions";
import { data, emptyData, filters } from "../../../../tests/ui/dashboard/fixtures";
import { formatMoney } from "@/modules/accounts/model";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("shows exact financial results, currency and separate current balance", () => {
  render(<DashboardScreen data={data} filters={filters} name="Alex" />);
  expect(screen.getByRole("region", { name: "Balance total · DOP" })).toHaveTextContent(formatMoney("128450", "DOP"));
  expect(screen.getByRole("region", { name: "Ahorro del período" })).toHaveTextContent(formatMoney("16560", "DOP"));
  expect(screen.getByText(/01\/09\/2026 — 30\/09\/2026 · DOP/)).toBeInTheDocument();
  expect(screen.getByText(/No cambia con el período/)).toBeInTheDocument();
  expect(screen.getByRole("progressbar", { name: "Consumo de Alimentación" })).toHaveAttribute("aria-valuenow", "100");
  expect(screen.getByRole("progressbar", { name: "Consumo de Alimentación" })).toHaveAttribute("aria-valuetext", "150.00% utilizado. Límite superado");
});
it("does not call a deficit savings and avoids dividing by zero", () => {
  render(<DashboardScreen data={{ ...data, income: "0", expense: "100" }} filters={filters} name="Alex" />);
  expect(screen.getByRole("region", { name: "Ahorro del período" })).toHaveTextContent(formatMoney("0", "DOP"));
  expect(screen.getByText(/Déficit de/)).toBeInTheDocument();
  expect(screen.getByText("Tasa no disponible: no hay ingresos")).toBeInTheDocument();
});
it("offers useful empty states instead of fictional charts", () => {
  render(<DashboardScreen data={emptyData} filters={filters} name="Alex" />);
  expect(screen.getByText("No hay ingresos ni gastos en este período.")).toBeInTheDocument();
  expect(screen.getByText("Todavía no hay gastos que distribuir.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Planificar un presupuesto" })).toHaveAttribute("href", "/budgets");
});
it("navigates with validated filters and blocks reversed dates", () => {
  render(<DashboardScreen data={data} filters={filters} name="Alex" />);
  fireEvent.change(screen.getByLabelText("Moneda"), { target: { value: "USD" } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
  expect(router.push).toHaveBeenCalledWith(expect.stringContaining("currency=USD"));
  router.push.mockClear();
  fireEvent.change(screen.getByLabelText("Período"), { target: { value: "custom" } });
  fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-30" } });
  fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Revisa las fechas");
  expect(router.push).not.toHaveBeenCalled();
});
it("provides an exact accessible table as an alternative to bars", () => {
  render(<DashboardScreen data={data} filters={filters} name="Alex" />);
  fireEvent.click(screen.getByText("Ver cifras del gráfico"));
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(6);
});
it("shows a safe error when quick entry cannot be opened", async () => {
  vi.mocked(loadDashboardOptionsAction).mockResolvedValue({ status: "error", message: "No pudimos abrir el formulario." });
  render(<DashboardScreen data={data} filters={filters} name="Alex" />);
  fireEvent.click(screen.getByRole("button", { name: "Nueva transacción" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos abrir el formulario.");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("keeps loading and error distinct from zero totals and allows retry", () => {
  const view = render(<DashboardLoading />);
  expect(screen.getByRole("status")).toHaveTextContent("Preparando");
  view.rerender(<DashboardUnavailable />);
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(router.refresh).toHaveBeenCalled();
});
