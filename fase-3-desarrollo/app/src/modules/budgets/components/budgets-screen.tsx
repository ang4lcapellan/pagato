"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

import { getCategoryColor, type Category } from "@/modules/categories/model";
import { CategoryIcon } from "@/modules/categories/components/category-icon";
import { BUDGET_PAGE_SIZE, budgetProgress, budgetsUrl, type Budget, type BudgetFilters, type BudgetList } from "../model";
import { BudgetEditor } from "./budget-editor";
import { BudgetStatusDialog } from "./budget-status-dialog";
type Panel = { kind: "create"; id: string } | { kind: "edit" | "status"; budget: Budget } | null;

export function BudgetsScreen({ data, categories, filters, currentMonth, currency }: {
  data: BudgetList; categories: Category[]; filters: BudgetFilters; currentMonth: string; currency: string;
}) {
  const { t: tr, formatMoney, formatDate: formatBudgetDate, message: msg, formatNumber } = usePresentation();
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState("");
  const [refreshing, startRefresh] = useTransition();
  const refresh = useCallback(() => { startRefresh(() => router.refresh()); }, [router]);
  // Refresh on return from another tab (e.g. editing a transaction), without background polling.
  useEffect(() => { const onFocus = () => { if (!panel) refresh(); }; window.addEventListener("focus", onFocus); return () => window.removeEventListener("focus", onFocus); }, [refresh, panel]);
  const saved = useCallback((message: string) => { setPanel(null); setNotice(message); refresh(); }, [refresh]);
  const create = () => { setNotice(""); setPanel({ kind: "create", id: crypto.randomUUID() }); };
  const pages = Math.max(1, Math.ceil(data.count / BUDGET_PAGE_SIZE));
  return <>
    <nav className="category-breadcrumb" aria-label={tr("Ubicación")}><Link href="/budgets">{tr("Presupuestos mensuales")}</Link><span>/</span><span>{tr("Límites individuales")}</span></nav>
    <header className="accounts-heading"><div><h1>{tr("Límites individuales")}</h1><p>{tr("Presupuestos por categoría, independientes de un plan mensual.")}</p></div><button className="button button-primary new-account gap-2" aria-label={tr("Nuevo presupuesto")} onClick={create}><Icon name="plus" /><span>{tr("Nuevo presupuesto")}</span></button></header>
    {notice && <div className="account-success mt-5 flex items-center justify-between gap-3" role="status"><span>{tr(notice)}</span><button className="icon-button" aria-label={tr("Cerrar aviso")} onClick={() => setNotice("")}><Icon name="close" /></button></div>}
    <form className="budget-filters" action="/budgets" key={`${filters.month}-${filters.status}`}><input type="hidden" name="view" value="individual" /><label><span>{tr("Mes")}</span><input type="month" name="month" className="auth-input" defaultValue={filters.month} min="0001-01" max="9999-12" /></label><label><span>{tr("Estado")}</span><select name="status" className="auth-input" defaultValue={filters.status}><option value="active">{tr("Activos")}</option><option value="archived">{tr("Archivados")}</option><option value="all">{tr("Todos")}</option></select></label><button className="button button-primary">{tr("Aplicar")}</button><Link href={`${budgetsUrl({ ...filters, month: "", status: "all" })}&view=individual`} className="button button-secondary">{tr("Ver todos")}</Link></form>
    <section className="budget-overview" aria-label={tr("Resumen de presupuestos")}>
      {data.totals.map(total => { const p = budgetProgress(total.amount, total.spent); return <div className="budget-summary" key={total.currency}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2>{tr("Presupuesto ")}{total.currency}</h2><span>{total.count} {total.count === 1 ? tr("límite") : tr("límites")}</span></div>
        <p className="budget-summary-amount money-value">{formatMoney(total.spent, total.currency)} <span>{tr("de ")}{formatMoney(total.amount, total.currency)}</span></p>
        <div className="budget-progress-track" aria-hidden="true"><span style={{ width: `${p.bar}%` }} /></div>
        <p className="mt-3 text-sm">{formatNumber(p.percent)}{tr("% utilizado")}</p>
      </div>; })}
      {!data.totals.length && <div className="budget-summary"><Icon name="budget" /><h2 className="mt-3">{tr("Dale un plan a tu dinero")}</h2><p className="mt-2 text-sm leading-6">{tr("Elige una categoría y cuánto quieres gastar. Te ayudamos a seguir el progreso.")}</p></div>}
    </section>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-bold">{tr("Tus límites por categoría")}</h2><button type="button" className="category-text-button" disabled={refreshing} onClick={refresh}>{refreshing ? tr("Actualizando…") : tr("Actualizar progreso")}</button></div>
    {data.budgets.length ? <div className="budgets-grid">{data.budgets.map(b => { const p = budgetProgress(b.amount, b.spent); return <article className={`budget-card budget-${p.level}`} aria-label={b.name} key={b.id}>
      <div className="flex items-start gap-3"><span className="category-symbol" style={{ backgroundColor: `${getCategoryColor(b.categoryColor)}22` }}><CategoryIcon name={b.categoryIcon} /></span><div className="min-w-0"><h3 className="break-words text-base font-bold">{b.name}</h3><p className="mt-1 break-words text-xs text-[var(--muted)]">{b.categoryName} · {b.currency}</p></div></div>
      <p className="mt-4 text-xs text-[var(--muted)]"><time dateTime={b.periodStart}>{formatBudgetDate(b.periodStart)}</time> — <time dateTime={b.periodEnd}>{formatBudgetDate(b.periodEnd)}</time></p>
      <p className="budget-card-amount money-value">{formatMoney(b.spent, b.currency)} <span>/ {formatMoney(b.amount, b.currency)}</span></p>
      <div className="budget-progress-track" role="progressbar" aria-label={msg`Progreso de ${b.name}`} aria-valuenow={p.bar} aria-valuemin={0} aria-valuemax={100} aria-valuetext={msg`${formatNumber(p.percent)}% utilizado. ${tr(p.label)}.`}><span style={{ width: `${p.bar}%` }} /></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span>{formatNumber(p.percent)}{tr("% usado")}</span><span className="budget-health">{tr(p.label)}</span></div>
      <dl className="budget-remaining"><dt>{tr("Disponible")}</dt><dd className="money-value">{formatMoney(p.available, b.currency)}</dd>{p.excess !== "0.0000" && <><dt>{tr("Excedido")}</dt><dd className="money-value budget-excess">{formatMoney(p.excess, b.currency)}</dd></>}</dl>
      {(b.status === "archived" || !b.categoryActive) && <p className="mt-3 flex flex-wrap gap-2">{b.status === "archived" && <span className="category-badge category-badge-inactive">{tr("Archivado")}</span>}{!b.categoryActive && <span className="category-badge category-badge-inactive">{tr("Categoría inactiva")}</span>}</p>}
      <div className="category-card-actions">{b.status === "active" && <button className="category-text-button" aria-label={msg`Editar ${b.name}`} onClick={() => setPanel({ kind: "edit", budget: b })}><Icon name="edit" />{tr("Editar")}</button>}<button className="category-text-button" aria-label={`${tr(b.status === "active" ? "Archivar" : "Reactivar")} ${b.name}`} onClick={() => setPanel({ kind: "status", budget: b })}><Icon name={b.status === "active" ? "archive" : "plus"} />{b.status === "active" ? tr("Archivar") : tr("Reactivar")}</button></div>
    </article>; })}</div> : <section className="accounts-empty"><span className="empty-wallet"><Icon name="budget" /></span><h2 className="mt-5 text-xl font-bold">{tr("Sin presupuestos para esta selección")}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{tr("Crea tu primer límite o cambia los filtros para consultar otros períodos.")}</p><button className="button button-primary mt-5" onClick={create}>{tr("Crear presupuesto")}</button></section>}
    <div className="transaction-pagination"><p role="status">{data.count} {data.count === 1 ? tr("presupuesto") : tr("presupuestos")} {tr("· Página ")}{filters.page} {tr("de ")}{pages}</p><nav aria-label={tr("Páginas de presupuestos")}>{filters.page > 1 && <Link className="button button-secondary" href={`${budgetsUrl(filters, filters.page - 1)}&view=individual`}>{tr("Anterior")}</Link>}{filters.page < pages && <Link className="button button-secondary" href={`${budgetsUrl(filters, filters.page + 1)}&view=individual`}>{tr("Siguiente")}</Link>}</nav></div>
    <p className="mt-5 max-w-3xl text-xs leading-5 text-[var(--muted)]">{tr("El mes muestra los presupuestos que coinciden con él, pero cada progreso abarca su período completo, sin prorratear. El resumen suma los presupuestos filtrados; si incluyes archivados, pueden solaparse. No es tu gasto total. Solo cuentan gastos no eliminados en la misma moneda. Zona horaria: ")}{data.timezone}.</p>
    {panel?.kind === "create" && <BudgetEditor id={panel.id} categories={categories} month={filters.month || currentMonth} currency={currency} onClose={() => setPanel(null)} onSaved={saved} />}
    {panel?.kind === "edit" && <BudgetEditor id={panel.budget.id} budget={panel.budget} categories={categories} month={filters.month || currentMonth} currency={currency} onClose={() => setPanel(null)} onSaved={saved} />}
    {panel?.kind === "status" && <BudgetStatusDialog budget={panel.budget} onClose={() => setPanel(null)} onSaved={saved} />}
  </>;
}
