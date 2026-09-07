import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { getFinancialProfile } from "@/modules/users/server/profile-service";
import { dashboardFiltersSchema, dashboardRange, defaultDashboardFilters } from "@/modules/dashboard/model";
import { getDashboard } from "@/modules/dashboard/server/repository";
import { DashboardScreen } from "@/modules/dashboard/components/dashboard-screen";
import { DashboardUnavailable } from "@/modules/dashboard/components/dashboard-states";
import { privatePageMetadata } from "@/lib/page-metadata";

export const metadata = privatePageMetadata("Inicio · Resumen financiero", "Resumen privado de balances, movimientos, gastos, ingresos y presupuestos.");
export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const result = await getFinancialProfile();
  if (result.status !== "ready") return <AppShell active="/dashboard" name="Mi cuenta"><section className="profile-card">
    <h1 className="text-2xl font-bold">{result.status === "invalid-session" ? "Necesitas iniciar sesión de nuevo" : "Tu perfil no está disponible"}</h1>
    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{result.status === "inactive" ? "El perfil está suspendido o eliminado. No modificamos tus datos." : "No pudimos preparar tu perfil financiero. Comprueba tu conexión y que la sesión siga activa; no necesitas registrarte otra vez."}</p>
    {result.status === "unavailable" && <a href="/dashboard" className="button button-primary mt-5">Reintentar</a>}
    {result.status === "invalid-session" && <Link href="/auth/sign-in" className="button button-primary mt-5">Iniciar sesión</Link>}
  </section></AppShell>;
  const profile = result.profile;
  const defaults = defaultDashboardFilters(profile.preferences.baseCurrency, profile.preferences.timezone);
  const parsed = dashboardFiltersSchema.safeParse({ ...defaults, ...await searchParams });
  if (!parsed.success) return <AppShell active="/dashboard" name={profile.displayName}><section className="profile-card">
    <h1 className="text-2xl font-bold">Revisa el período seleccionado</h1><p className="mt-3 text-sm leading-6">Selecciona un mes, un año o un rango de fechas ordenado de hasta 366 días, y una moneda válida.</p>
    <Link href="/dashboard" className="button button-primary mt-5">Restablecer filtros</Link>
  </section></AppShell>;
  let data;
  try { data = await getDashboard(getSqlClient(), { userId: session.user.id, sessionId: session.session.id }, parsed.data, dashboardRange(parsed.data)); }
  catch { console.error("[dashboard] No se pudo consultar el resumen financiero."); }
  return <AppShell active="/dashboard" name={profile.displayName}>{data
    ? <DashboardScreen key={JSON.stringify(parsed.data)} name={profile.displayName} data={data} filters={parsed.data} />
    : <DashboardUnavailable />}</AppShell>;
}
