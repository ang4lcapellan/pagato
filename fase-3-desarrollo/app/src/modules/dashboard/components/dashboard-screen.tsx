"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { CURRENCIES, toUnits, type FinancialAccount } from "@/modules/accounts/model";
import type { Category } from "@/modules/categories/model";
import { budgetProgress } from "@/modules/budgets/model";
import { TRANSACTION_TYPES, type Transaction } from "@/modules/transactions/model";
import { TransactionEditor } from "@/modules/transactions/components/transaction-editor";
import { TransactionAmount, TransactionDetail, TransactionDeleteDialog } from "@/modules/transactions/components/transaction-detail";
import { loadDashboardOptionsAction } from "../server/actions";
import { dashboardFiltersSchema, dashboardMetrics, dashboardRange, dashboardUrl, type DashboardData, type DashboardFilters } from "../model";
import { CashFlow, CategoryDistribution } from "./dashboard-charts";

function PeriodFilters({ filters, currencies }: { filters: DashboardFilters; currencies: string[] }) {
  const { t: tr, formatDate } = usePresentation();
  const router = useRouter();
  const [values, setValues] = useState(filters);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = (key: keyof DashboardFilters, value: string) => { setError(""); setValues(v => ({ ...v, [key]: value })); };
  return <form className="dashboard-filters" data-expanded={expanded} aria-label={tr("Filtros del resumen")} onSubmit={event => {
    event.preventDefault();
    const parsed = dashboardFiltersSchema.safeParse({ ...values, year: values.year.padStart(4, "0") });
    if (!parsed.success) { setError("Revisa las fechas: el rango debe estar ordenado y no superar 366 días."); return; }
    startTransition(() => router.push(dashboardUrl(parsed.data)));
  }}>
    <button type="button" className="dashboard-filter-toggle" aria-expanded={expanded} aria-controls="dashboard-filter-fields" onClick={() => setExpanded(v => !v)}><span>{filters.period === "month" ? filters.month : filters.period === "year" ? filters.year : `${formatDate(filters.from)} — ${formatDate(filters.to)}`} · {filters.currency}</span><strong>{expanded ? tr("Ocultar filtros") : tr("Cambiar período")} <span aria-hidden="true">⌄</span></strong></button>
    <div className="dashboard-filter-fields" id="dashboard-filter-fields">
    <div className="account-field"><label htmlFor="dashboard-period">{tr("Período")}</label><select className="auth-input" id="dashboard-period" value={values.period} onChange={e => set("period", e.target.value)}><option value="month">{tr("Mensual")}</option><option value="year">{tr("Anual")}</option><option value="custom">{tr("Personalizado")}</option></select></div>
    {values.period === "month" && <div className="account-field"><label htmlFor="dashboard-month">{tr("Mes")}</label><input className="auth-input" id="dashboard-month" type="month" min="0001-01" max="9999-12" required value={values.month} onChange={e => set("month", e.target.value)} /></div>}
    {values.period === "year" && <div className="account-field"><label htmlFor="dashboard-year">{tr("Año")}</label><input className="auth-input" id="dashboard-year" type="number" min="1" max="9999" required value={values.year} onChange={e => set("year", e.target.value)} /></div>}
    {values.period === "custom" && <>{(["from", "to"] as const).map(key => <div className="account-field" key={key}><label htmlFor={`dashboard-${key}`}>{key === "from" ? tr("Desde") : tr("Hasta")}</label><input className="auth-input" id={`dashboard-${key}`} type="date" min="0001-01-01" max="9999-12-31" required value={values[key]} onChange={e => set(key, e.target.value)} aria-describedby={error ? "dashboard-filter-error" : undefined} /></div>)}</>}
    <div className="account-field dashboard-currency"><label htmlFor="dashboard-currency">{tr("Moneda")}</label><select className="auth-input" id="dashboard-currency" value={values.currency} onChange={e => set("currency", e.target.value)}>{[...new Set([...Object.keys(CURRENCIES), ...currencies])].sort().map(c => <option key={c} value={c}>{c} · {tr(CURRENCIES[c as keyof typeof CURRENCIES] ?? c)}</option>)}</select></div>
    <button type="submit" className="button button-secondary" disabled={pending}>{pending ? tr("Consultando…") : tr("Aplicar")}</button>
    {error && <p role="alert" id="dashboard-filter-error" className="field-error dashboard-filter-error">{tr(error)}</p>}
    </div>
  </form>;
}

export function DashboardScreen({ data, filters, name }: { data: DashboardData; filters: DashboardFilters; name: string }) {
  const { formatMoney, t: tr, message: msg, formatDate, formatNumber } = usePresentation();
  const router = useRouter(), range = dashboardRange(filters), metrics = dashboardMetrics(data.income, data.expense);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);
  const [options, setOptions] = useState<{ accounts: FinancialAccount[]; categories: Category[] } | null>(null);
  const [editor, setEditor] = useState<{ id: string; transaction?: Transaction } | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const onSaved = useCallback((message: string) => { setEditor(null); setDeleting(null); setDetail(null); setNotice({ error: false, text: message }); router.refresh(); }, [router, setEditor, setDeleting, setDetail, setNotice]);
  async function openEditor(transaction?: Transaction) {
    if (openingRef.current) return;
    openingRef.current = true; setOpening(true); setNotice(null); setDetail(null);
    try {
      const result = await loadDashboardOptionsAction();
      if (result.status !== "ready") { setNotice({ error: true, text: result.message }); return; }
      setOptions(result); setDetail(null); setEditor({ id: transaction?.id ?? crypto.randomUUID(), transaction });
    } catch { setNotice({ error: true, text: "No pudimos abrir el formulario. Reintenta o vuelve a iniciar sesión." }); }
    finally { openingRef.current = false; setOpening(false); }
  }
  const historyHref = `/transactions?from=${range.from}&to=${range.to}` as const;
  const money = (v: string) => formatMoney(v, filters.currency);
  return <div className="dashboard-screen">
    <header className="dashboard-heading"><div><h1>{tr("Hola, ")}{name.trim().split(/\s+/)[0] || tr("bienvenido")}</h1><p>{tr("Así van tus finanzas. Un paso a la vez.")}</p></div><button className="button button-primary" disabled={opening} onClick={() => void openEditor()}><Icon name="plus" />{opening ? tr("Preparando…") : tr("Nueva transacción")}</button></header>
    <PeriodFilters filters={filters} currencies={data.currencies} />
    {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "account-alert" : "account-note"}>{tr(notice.text)}</p>}
    <section className="dashboard-balance" aria-labelledby="balance-title"><div><p id="balance-title">{tr("Balance total · ")}{filters.currency}</p><strong className="dashboard-balance-amount">{money(data.balance)}</strong><span className="dashboard-balance-badge">{data.accountCount} {data.accountCount === 1 ? tr("cuenta activa") : tr("cuentas activas")}</span></div><div className="dashboard-balance-note"><p>{tr("Saldo actual de tus cuentas activas.")}</p><p>{tr("No cambia con el período. Las monedas se consultan por separado.")}</p><Link href="/accounts">{tr("Ver mis cuentas ")}<span aria-hidden="true">↗</span></Link></div></section>
    {!data.accountCount && <p className="account-note">{tr("No tienes cuentas activas en ")}{filters.currency}{tr(". Puedes elegir otra moneda o ")}<Link href="/accounts" className="underline">{tr("crear una cuenta")}</Link>{tr(". El historial conserva los movimientos de las cuentas archivadas.")}</p>}
    <div className="dashboard-period-caption"><h2>{tr("Resumen del período")}</h2><span>{`${formatDate(range.from)} — ${formatDate(range.to)}`} · {filters.currency}</span></div>
    <div className="dashboard-metrics">
      <section className="dashboard-metric dashboard-metric-income" aria-label={tr("Ingresos del período")}><span><Icon name="income" />{tr("Ingresos")}</span><strong>{money(data.income)}</strong><small>{tr("Dinero que recibiste")}</small></section>
      <section className="dashboard-metric dashboard-metric-expense" aria-label={tr("Gastos del período")}><span><Icon name="expense" />{tr("Gastos")}</span><strong>{money(data.expense)}</strong><small>{tr("Dinero que gastaste")}</small></section>
      <section className="dashboard-metric dashboard-metric-savings" aria-label={tr("Ahorro del período")}><span><Icon name="budget" />{tr("Ahorro")}</span><strong>{money(metrics.savings)}</strong><small>{metrics.rate === null ? tr("Tasa no disponible: no hay ingresos") : msg`Tasa de ahorro: ${formatNumber(metrics.rate.replace(',', '.').replace('%', ''))}%`}</small></section>
    </div>
    <div className="dashboard-net"><div><span>{tr("Balance neto del período")}</span><strong className={toUnits(metrics.net) < BigInt(0) ? "dashboard-negative" : ""}>{money(metrics.net)}</strong></div><p>{toUnits(metrics.net) < BigInt(0) ? msg`Déficit de ${money(metrics.deficit)}: gastaste más de lo que ingresaste.` : tr("Ingresos menos gastos. El ahorro es el excedente positivo de este período, no el saldo de una cuenta de ahorro.")} {tr("Las transferencias no se suman como ingresos ni gastos.")}</p></div>
    <div className="dashboard-main-grid"><CashFlow trend={data.trend} range={range} currency={filters.currency} />
      <section className="dashboard-panel" aria-labelledby="recent-title"><div className="dashboard-panel-heading"><div><h2 id="recent-title">{tr("Movimientos recientes")}</h2><p>{tr("Últimos ")}{data.recent.length} {tr("del período en ")}{filters.currency}</p></div><Link href={historyHref}>{tr("Ver historial")}</Link></div>
        {data.recent.length ? <ul className="dashboard-recent">{data.recent.map(t => <li key={t.id}><button onClick={() => setDetail(t)} className="dashboard-movement"><span className={`dashboard-movement-icon dashboard-movement-${t.type}`}><Icon name={t.type === "transfer" ? "movements" : t.type} /></span><span className="dashboard-movement-copy"><strong>{t.description || tr(TRANSACTION_TYPES[t.type])}</strong><small>{t.categoryName || tr(TRANSACTION_TYPES[t.type])} · {formatDate(t.occurredLocal)}</small></span><TransactionAmount transaction={t} /></button></li>)}</ul> : <div className="dashboard-empty"><p>{tr("No hay movimientos en esta selección.")}</p><span>{tr("Cambia el período o registra tu primera transacción.")}</span></div>}
        {data.recent.length > 0 && <p className="dashboard-footnote">{tr("Selecciona un movimiento para ver su detalle. El historial completo incluye todas las monedas.")}</p>}
      </section>
    </div>
    <div className="dashboard-bottom-grid"><CategoryDistribution slices={data.distribution} expense={data.expense} currency={filters.currency} />
      <section className="dashboard-panel" aria-labelledby="budgets-title"><div className="dashboard-panel-heading"><div><h2 id="budgets-title">{tr("Tus presupuestos")}</h2><p>{tr("Activos y coincidentes con el período · ")}{filters.currency}</p></div><Link href="/budgets">{tr("Ver todos")}</Link></div>
        {data.budgets.length ? <><ul className="dashboard-budget-list">{data.budgets.map(b => { const progress = budgetProgress(b.amount, b.spent); return <li key={b.id}>
          <Link href={b.kind === "monthly" ? `/budgets/${b.id}` : "/budgets?view=individual&month=&status=active"} className="dashboard-budget-link"><div><strong>{b.name}</strong><small>{b.kind === "monthly" ? tr("Mensual") : tr("Por categoría")} · {formatDate(b.periodStart)} — {formatDate(b.periodEnd)}</small></div><span aria-hidden="true">↗</span></Link>
          <div className={`dashboard-budget-progress dashboard-budget-${progress.level}`}><div className="dashboard-progress-track" role="progressbar" aria-label={msg`Consumo de ${b.name}`} aria-valuenow={progress.bar} aria-valuemin={0} aria-valuemax={100} aria-valuetext={msg`${formatNumber(progress.percent)}% utilizado. ${tr(progress.label)}`}><span style={{ width: `${progress.bar}%` }} /></div><div className="dashboard-budget-figures"><span>{money(b.spent)} {tr("de ")}{money(b.amount)}</span><strong>{formatNumber(progress.percent)}%</strong></div><p>{tr(progress.label)} · {toUnits(progress.excess) > BigInt(0) ? msg`${money(progress.excess)} de exceso` : msg`${money(progress.available)} disponibles`}</p></div>
        </li>; })}</ul><p className="dashboard-footnote">{tr("Mostrando ")}{data.budgets.length} {tr("de ")}{data.budgetCount}{tr(". El consumo corresponde al período completo de cada presupuesto. Los límites por categoría de un plan están dentro de su detalle.")}</p></> : <div className="dashboard-empty"><p>{tr("Aún no hay presupuestos activos para esta selección.")}</p><Link href="/budgets" className="button button-secondary">{tr("Planificar un presupuesto")}</Link></div>}
      </section>
    </div>
    <p className="dashboard-updated">{tr("Actualizado: ")}{formatDate(data.refreshedAt)} {tr("a las ")}{data.refreshedAt.slice(11, 16)} · {data.timezone.replaceAll("_", " ")}</p>
    {detail && <TransactionDetail transaction={detail} timezone={data.timezone} onClose={() => setDetail(null)} onEdit={() => void openEditor(detail)} onDelete={() => { setDeleting(detail); setDetail(null); }} />}
    {editor && options && <TransactionEditor key={editor.id} {...editor} {...options} timezone={data.timezone} onClose={() => setEditor(null)} onSaved={onSaved} />}
    {deleting && <TransactionDeleteDialog transaction={deleting} onClose={() => setDeleting(null)} onSaved={onSaved} />}
  </div>;
}
