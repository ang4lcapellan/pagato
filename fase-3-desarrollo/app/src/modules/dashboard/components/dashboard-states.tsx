"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DashboardUnavailable({ retry }: { retry?: () => void }) {
  const { t: tr } = usePresentation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <section className="profile-card" role="alert"><h1 className="text-2xl font-bold">{tr("No pudimos cargar tu resumen")}</h1>
    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{tr("Comprueba tu conexión y que tu sesión siga activa. Tus datos no se han modificado; no mostramos cifras en cero cuando falla la consulta.")}</p>
    <button className="button button-primary mt-5" disabled={pending} onClick={() => startTransition(() => retry ? retry() : router.refresh())}>{pending ? tr("Consultando…") : tr("Reintentar")}</button>
  </section>;
}
export function DashboardLoading() {
  const { t: tr } = usePresentation();
  return <section className="dashboard-loading" aria-busy="true" aria-label={tr("Cargando resumen financiero")}>
    <p role="status" className="text-sm text-[var(--muted)]">{tr("Preparando tu resumen financiero…")}</p>
    <div className="dashboard-skeleton dashboard-skeleton-hero" aria-hidden="true" />
    <div className="dashboard-metrics" aria-hidden="true">{[0, 1, 2].map(n => <div className="dashboard-skeleton" key={n} />)}</div>
    <div className="dashboard-skeleton dashboard-skeleton-chart" aria-hidden="true" />
  </section>;
}
