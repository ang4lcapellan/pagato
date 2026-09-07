"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

import { budgetProgress, budgetsUrl, type BudgetFilters } from "../../model";
import { allocationSummary, nextMonth, planUrl, type Plan, type PlanList } from "../model";
import { PlanDialog } from "./plan-dialog";
export function PlansScreen({ data, filters, month, currency }: { data: PlanList; filters: BudgetFilters; month: string; currency: string }) {
  const { t: tr, formatMoney, message: msg, formatNumber } = usePresentation();
  const router = useRouter();
  const [dialog, setDialog] = useState<{ id: string; requestId: string; source?: Plan } | null>(null);
  const saved = useCallback((id: string) => { setDialog(null); router.push(planUrl(id)); router.refresh(); }, [router]);
  const create = (source?: Plan) => setDialog({ id: crypto.randomUUID(), requestId: crypto.randomUUID(), source });
  const pages = Math.max(1, Math.ceil(data.count / 12));
  return <>
    <header className="accounts-heading"><div><h1>{tr("Presupuestos")}</h1><p>{tr("Un plan para tu mes. Cada categoría, bajo tu control.")}</p></div><button className="button button-primary new-account gap-2" aria-label={tr("Nuevo presupuesto mensual")} onClick={() => create()}><Icon name="plus" /><span>{tr("Nuevo presupuesto mensual")}</span></button></header>
    <div className="plan-intro"><span className="empty-wallet"><Icon name="budget" /></span><div><h2>{tr("Primero tu mes, después tus categorías")}</h2><p>{tr("Define un límite mensual, reparte el dinero y consulta cómo van tus gastos. Puedes reutilizar cualquier mes como plantilla.")}</p></div></div>
    <form action="/budgets" className="budget-filters" key={`${filters.month}-${filters.status}`}><label><span>{tr("Mes")}</span><input type="month" name="month" className="auth-input" defaultValue={filters.month} min="0001-01" max="9999-12" /></label><label><span>{tr("Estado")}</span><select name="status" defaultValue={filters.status} className="auth-input"><option value="active">{tr("Activos")}</option><option value="archived">{tr("Archivados")}</option><option value="all">{tr("Todos")}</option></select></label><button className="button button-primary">{tr("Aplicar")}</button><Link className="button button-secondary" href="/budgets?month=&status=all">{tr("Ver todos")}</Link></form>
    {data.plans.length ? <div className="plans-grid">{data.plans.map(p => { const progress = budgetProgress(p.amount, p.spent); const summary = allocationSummary(p.amount, p.expectedIncome ?? "", [{ amount: p.allocated }]); return <article key={p.id} className="monthly-plan-card">
      <div className="flex flex-wrap items-start justify-between gap-3"><span className="category-badge">{p.month} · {p.currency}</span>{p.status === "archived" && <span className="category-badge category-badge-inactive">{tr("Archivado")}</span>}</div>
      <h2 className="mt-5 break-words text-xl font-bold"><Link href={planUrl(p.id)}>{p.name}</Link></h2><p className="mt-2 text-xs text-[var(--muted)]">{p.categoryCount} {tr("categorías asignadas")}</p>
      <p className="mt-6 text-xs text-[var(--muted)]">{tr("Límite mensual")}</p><p className="money-value mt-1 text-3xl font-bold">{formatMoney(p.amount, p.currency)}</p>
      <dl className="plan-card-metrics"><dt>{tr("Repartido")}</dt><dd className="money-value">{formatMoney(p.allocated, p.currency)}</dd><dt>{tr("Sin asignar")}</dt><dd className="money-value">{formatMoney(summary.remaining, p.currency)}</dd><dt>{tr("Gastado realmente")}</dt><dd className="money-value">{formatMoney(p.spent, p.currency)}</dd></dl>
      <div className="budget-progress-track" aria-label={tr("Consumo real del límite")} role="progressbar" aria-valuenow={progress.bar} aria-valuemin={0} aria-valuemax={100} aria-valuetext={msg`${formatNumber(progress.percent)}% utilizado`}><span style={{ width: `${progress.bar}%` }} /></div><p className="mt-2 text-xs text-[var(--muted)]">{formatNumber(progress.percent)}{tr("% del límite utilizado")}</p>
      <div className="plan-card-actions"><Link href={planUrl(p.id)} className="button button-primary">{tr("Abrir presupuesto")}</Link><button className="button button-secondary" aria-label={msg`Copiar ${p.name}`} onClick={() => create(p)}>{tr("Copiar")}</button></div>
    </article>; })}</div> : <section className="accounts-empty"><h2 className="text-xl font-bold">{tr("Prepara tu próximo mes")}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{tr("No hay presupuestos mensuales en esta selección. Crea uno o elige Ver todos para copiar un mes anterior.")}</p><button className="button button-primary mt-5" onClick={() => create()}>{tr("Crear mi presupuesto mensual")}</button></section>}
    <div className="transaction-pagination"><p>{data.count} {tr("presupuestos mensuales · Página ")}{filters.page} {tr("de ")}{pages}</p><nav aria-label={tr("Páginas de presupuestos")}>{filters.page > 1 && <Link className="button button-secondary" href={budgetsUrl(filters, filters.page - 1)}>{tr("Anterior")}</Link>}{filters.page < pages && <Link className="button button-secondary" href={budgetsUrl(filters, filters.page + 1)}>{tr("Siguiente")}</Link>}</nav></div>
    <aside className="plan-legacy"><h2 className="font-bold">{tr("¿Prefieres un límite individual?")}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{tr("Tus presupuestos anteriores siguen disponibles, sin cambios. También puedes crear límites por categoría sin agruparlos en un mes.")}</p><Link href="/budgets?view=individual&month=&status=all" className="button button-secondary mt-4">{tr("Ver límites individuales")}</Link></aside>
    {dialog && <PlanDialog {...dialog} month={dialog.source ? nextMonth(dialog.source.month) : filters.month || month} currency={currency} onClose={() => setDialog(null)} onSaved={saved} />}
  </>;
}
