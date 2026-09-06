import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { DashboardScreen } from "@/modules/dashboard/components/dashboard-screen";
import { DashboardLoading, DashboardUnavailable } from "@/modules/dashboard/components/dashboard-states";
import { data, emptyData, filters } from "./fixtures";

export function DashboardPreview({ mode }: { mode: string | null }) {
  useEffect(() => { document.documentElement.dataset.hydrated = "true"; }, []);
  const selected = mode === "empty" ? emptyData : mode === "large" ? { ...data, balance: "999999999999999999.9999", income: "999999999999999999.9999" } : data;
  return <AppShell active="/dashboard" name="Cuenta de prueba">{mode === "error" ? <DashboardUnavailable /> : mode === "loading" ? <DashboardLoading /> : <DashboardScreen name="Alex" data={selected} filters={filters} />}</AppShell>;
}
