import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { getFinancialProfile } from "@/modules/users/server/profile-service";
import { listCategories } from "@/modules/categories/server/repository";
import { localDateTime } from "@/modules/transactions/model";
import { BUDGET_PAGE_SIZE, budgetFiltersSchema, budgetsUrl } from "@/modules/budgets/model";
import { listBudgets } from "@/modules/budgets/server/repository";
import { BudgetsScreen } from "@/modules/budgets/components/budgets-screen";
import { listPlans } from "@/modules/budgets/plans/repository";
import { PlansScreen } from "@/modules/budgets/plans/components/plans-screen";
import { BudgetRetryButton } from "@/modules/budgets/components/retry-button";
export const metadata = { title: "Presupuestos" };
export const dynamic = "force-dynamic";
export default async function BudgetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const result = await getFinancialProfile();
  if (result.status !== "ready") return <AppShell active="/budgets" name="Mi cuenta"><h1 className="text-2xl font-bold">Tu perfil no está disponible</h1><p className="mt-3">Necesitamos un perfil activo para consultar tus presupuestos.</p><Link href="/dashboard" className="button button-secondary mt-5">Revisar mi perfil</Link></AppShell>;
  let currentMonth: string;
  try { currentMonth = localDateTime(new Date(), result.profile.preferences.timezone).slice(0, 7); }
  catch { currentMonth = localDateTime(new Date(), "UTC").slice(0, 7); }
  const raw = await searchParams;
  const parsed = budgetFiltersSchema.safeParse({ month: currentMonth, ...raw });
  if (!parsed.success) return <AppShell active="/budgets" name={result.profile.displayName}><section className="profile-card"><h1 className="text-2xl font-bold">Revisa los filtros</h1><p className="mt-3">Selecciona un mes, estado y página válidos.</p><Link href="/budgets" className="button button-primary mt-5">Restablecer filtros</Link></section></AppShell>;
  if (raw.view !== "individual") {
    let data;
    try { data = await listPlans(getSqlClient(), { userId: session.user.id, sessionId: session.session.id }, parsed.data); }
    catch { console.error("[budget-plans] No se pudieron consultar los planes."); }
    if (data && parsed.data.page > Math.max(1, Math.ceil(data.count / 12))) redirect(budgetsUrl(parsed.data, Math.max(1, Math.ceil(data.count / 12))));
    return <AppShell active="/budgets" name={result.profile.displayName}>{data ? <PlansScreen data={data} filters={parsed.data} month={currentMonth} currency={result.profile.preferences.baseCurrency} /> : <section className="profile-card"><h1 className="text-2xl font-bold">No pudimos cargar los presupuestos mensuales</h1><p className="mt-3">Comprueba tu conexión y vuelve a intentarlo. No se modificaron tus datos.</p><BudgetRetryButton /></section>}</AppShell>;
  }
  let content;
  try {
    const sql = getSqlClient(); const identity = { userId: session.user.id, sessionId: session.session.id };
    const [data, categories] = await Promise.all([listBudgets(sql, identity, parsed.data), listCategories(sql, identity)]);
    if (data && categories) content = { data, categories };
  } catch { console.error("[budgets] No se pudieron consultar los presupuestos."); }
  if (content && parsed.data.page > Math.max(1, Math.ceil(content.data.count / BUDGET_PAGE_SIZE))) redirect(`${budgetsUrl(parsed.data, Math.max(1, Math.ceil(content.data.count / BUDGET_PAGE_SIZE)))}&view=individual`);
  return <AppShell active="/budgets" name={result.profile.displayName}>{content ? <BudgetsScreen {...content} filters={parsed.data} currentMonth={currentMonth} currency={result.profile.preferences.baseCurrency} /> : <section className="profile-card"><h1 className="text-2xl font-bold">No pudimos cargar tus presupuestos</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Comprueba tu conexión y que tu sesión siga activa. Tus datos no se han modificado.</p><BudgetRetryButton /></section>}</AppShell>;
}
