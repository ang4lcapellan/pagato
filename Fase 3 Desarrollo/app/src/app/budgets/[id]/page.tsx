import { z } from "zod";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { getFinancialProfile } from "@/modules/users/server/profile-service";
import { listCategories } from "@/modules/categories/server/repository";
import { getPlan } from "@/modules/budgets/plans/repository";
import { PlanWorkspace } from "@/modules/budgets/plans/components/plan-workspace";
export const metadata = { title: "Mi presupuesto mensual" };
export const dynamic = "force-dynamic";
export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(); const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await getFinancialProfile();
  if (profile.status !== "ready") return <AppShell active="/budgets" name="Mi cuenta"><h1 className="text-2xl font-bold">Tu perfil no está disponible</h1><Link className="button button-secondary mt-4" href="/dashboard">Revisar mi perfil</Link></AppShell>;
  let result;
  try { const sql = getSqlClient(), identity = { userId: session.user.id, sessionId: session.session.id };
    const [detail, categories] = await Promise.all([getPlan(sql, identity, id), listCategories(sql, identity)]);
    result = { detail, categories };
  } catch { console.error("[budget-plans] No se pudo cargar el presupuesto."); }
  if (result && !result.detail) notFound();
  return <AppShell active="/budgets" name={profile.profile.displayName}>{result?.detail && result.categories ? <PlanWorkspace key={`${id}-${result.detail.plan.status}`} detail={result.detail} categories={result.categories} /> : <section className="profile-card"><h1 className="text-xl font-bold">No pudimos cargar este presupuesto</h1><p className="mt-3 text-sm">Comprueba tu conexión. No modificamos tus datos.</p><a href={`/budgets/${id}`} className="button button-primary mt-4">Reintentar</a></section>}</AppShell>;
}
