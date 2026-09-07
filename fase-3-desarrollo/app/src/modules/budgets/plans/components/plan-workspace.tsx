"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import Link from "next/link";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { fromUnits, toUnits } from "@/modules/accounts/model";
import { getCategoryColor, type Category } from "@/modules/categories/model";
import { CategoryEditor } from "@/modules/categories/components/category-editor";
import { CategoryIcon } from "@/modules/categories/components/category-icon";
import { budgetProgress } from "../../model";
import { allocationSummary, allocationWidth, draftUnits, initialPlanState, nextMonth, planUrl, rangeAmount, type PlanDetail } from "../model";
import { savePlanAction } from "../actions";
import { PlanDialog, PlanStatusDialog } from "./plan-dialog";
type Allocation = { key: string; categoryId: string; amount: string };
type Panel = { kind: "copy"; id: string; requestId: string } | { kind: "category"; id: string } | { kind: "status" } | null;
export function PlanWorkspace({ detail, categories }: { detail: PlanDetail; categories: Category[] }) {
  const { t: tr, formatDate: formatBudgetDate, formatMoney, message: msg, formatNumber } = usePresentation();
  const { plan, budgets } = detail; const router = useRouter();
  const form = useRef<HTMLFormElement>(null), requestId = useRef<string | null>(null);
  const [name, setName] = useState(plan.name), [amount, setAmount] = useState(plan.amount), [income, setIncome] = useState(plan.expectedIncome ?? "");
  const [rows, setRows] = useState<Allocation[]>(budgets.map(b => ({ key: b.id, categoryId: b.categoryId, amount: b.amount })));
  const [version, setVersion] = useState(plan.version);
  const snapshot = JSON.stringify({ name, amount, income, rows });
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const [panel, setPanel] = useState<Panel>(null);
  const dirty = snapshot !== savedSnapshot, archived = plan.status === "archived";
  const [state, action, pending] = useActionState(async (previous: typeof initialPlanState, data: FormData) => {
    const result = await savePlanAction(previous, data);
    if (result.status === "success" && result.version) { setVersion(result.version); setSavedSnapshot(snapshot); requestId.current = null; router.refresh(); }
    return result;
  }, initialPlanState);
  useEffect(() => { if (state.status === "error" && !pending) (form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>('[role="alert"]'))?.focus(); }, [state, pending]);
  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  const copied = useCallback((id: string) => { setPanel(null); router.push(planUrl(id)); router.refresh(); }, [router]);
  const statusSaved = useCallback(() => { setPanel(null); router.refresh(); }, [router]);
  const categorySaved = useCallback(() => { setPanel(null); router.refresh(); }, [router]);
  const summary = allocationSummary(amount, income, rows);
  const actual = budgetProgress(plan.amount, plan.spent);
  const outside = fromUnits(toUnits(plan.spent) - toUnits(plan.categorySpent));
  const active = categories.filter(c => c.categoryType === "expense" && c.isActive);
  const changeRow = (key: string, change: Partial<Allocation>) => setRows(rows.map(r => r.key === key ? { ...r, ...change } : r));
  const fieldError = (field: string) => state.fields?.[field]?.[0];
  const attrs = (field: string) => ({ "aria-invalid": Boolean(fieldError(field)), "aria-describedby": fieldError(field) ? `plan-error-${field}` : undefined });
  return <>
    <nav className="category-breadcrumb" aria-label={tr("Ubicación")}><Link href="/budgets" onClick={e => { if (dirty && !window.confirm(tr("Tienes cambios sin guardar. ¿Salir del presupuesto?"))) e.preventDefault(); }}>{tr("Presupuestos")}</Link><span>/</span><span>{plan.month}</span></nav>
    <header className="plan-heading"><div><p className="eyebrow">{tr("Plan mensual · ")}{plan.currency}</p><h1>{plan.name}</h1><p>{formatBudgetDate(plan.periodStart)} — {formatBudgetDate(plan.periodEnd)}</p></div><div className="flex flex-wrap gap-2"><button className="button button-secondary" disabled={dirty || pending} onClick={() => setPanel({ kind: "copy", id: crypto.randomUUID(), requestId: crypto.randomUUID() })}>{tr("Copiar a otro mes")}</button><button className="button button-secondary" disabled={dirty || pending} onClick={() => setPanel({ kind: "status" })}>{archived ? tr("Reactivar") : tr("Archivar")}</button></div></header>
    {archived && <p className="account-note mt-5">{tr("Este presupuesto está archivado. Puedes consultarlo, copiarlo o reactivarlo.")}</p>}
    {plan.version !== version && !archived && <p role="alert" className="account-alert mt-4">{tr("Hay una versión más reciente. Conservamos tu borrador; recarga antes de guardar para evitar sobrescribir cambios.")}</p>}
    <section className="plan-actual" aria-label={tr("Gastos reales del mes")}><div><p>{tr("Gastado realmente")}</p><strong className="money-value">{formatMoney(plan.spent, plan.currency)}</strong><span>{tr("de ")}{formatMoney(plan.amount, plan.currency)} {tr("de límite")}</span></div><div><p>{tr("Disponible real")}</p><strong className="money-value">{formatMoney(actual.available, plan.currency)}</strong><span>{formatNumber(actual.percent)}{tr("% utilizado")}</span></div>{actual.excess !== "0.0000" && <div><p>{tr("Límite superado en")}</p><strong className="money-value budget-excess">{formatMoney(actual.excess, plan.currency)}</strong></div>}</section>
    <p className="mb-7 text-xs leading-5 text-[var(--muted)]">{tr("Incluye todos los gastos de ")}{plan.currency} {tr("del mes, aunque no tengan un límite asignado. Fuera de las categorías asignadas: ")}{formatMoney(outside, plan.currency)}{tr(". No incluye ingresos ni transferencias.")}</p>
    <form ref={form} noValidate onSubmit={e => {
      e.preventDefault(); if (pending || archived) return;
      const data = new FormData(e.currentTarget); requestId.current ??= crypto.randomUUID();
      data.set("requestId", requestId.current); data.set("allocations", JSON.stringify(rows.map(({ categoryId, amount }) => ({ categoryId, amount }))));
      startTransition(() => action(data));
    }}>
      <input type="hidden" name="id" value={plan.id} /><input type="hidden" name="mode" value="edit" /><input type="hidden" name="version" value={version} /><input type="hidden" name="month" value={plan.month} /><input type="hidden" name="currency" value={plan.currency} />
      {state.status === "error" && <div role="alert" tabIndex={-1} className="account-alert mb-5"><p>{tr(state.message)}</p>{Object.entries(state.fields ?? {}).map(([key, errors]) => <p key={key} id={`plan-error-${key}`}>{errors.map(tr).join(" ")}</p>)}</div>}
      {state.status === "success" && !dirty && <p role="status" className="account-success mb-5">{tr(state.message)}</p>}
      <section className="plan-planner" aria-labelledby="planner-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="planner-title" className="text-xl font-bold">{tr("Planifica tu mes")}</h2><p className="mt-2 text-sm text-[var(--muted)]">{tr("Ajusta tus límites y visualiza cómo se reparte tu dinero.")}</p></div><span className="category-badge">{dirty ? tr("Cambios sin guardar") : tr("Distribución guardada")}</span></div>
        <div className="plan-projections" aria-live="polite"><div><p>{tr("Gastos planificados")}</p><strong className="money-value">{formatMoney(summary.allocated, plan.currency)}</strong></div><div><p>{tr("Ahorro proyectado")}</p><strong className="money-value">{summary.savings === null ? "—" : formatMoney(summary.savings, plan.currency)}</strong></div><div><p>{tr("Tasa de ahorro")}</p><strong>{summary.savingsRate === null ? "—" : `${formatNumber(summary.savingsRate)}%`}</strong></div></div>
        <div className="plan-allocation-heading"><h3>{tr("Desglose de categorías")}</h3><span className={summary.over ? "budget-excess" : ""}>{summary.over ? tr("Exceso de asignación: ") : tr("Sin asignar: ")}{formatMoney(fromUnits(summary.over ? -toUnits(summary.remaining) : toUnits(summary.remaining)), plan.currency)}</span></div>
        <div className="plan-distribution" aria-hidden="true">{rows.map((r, i) => <span key={r.key} style={{ width: `${allocationWidth(r.amount, summary.over ? summary.allocated : amount)}%`, backgroundColor: getCategoryColor(categories.find(c => c.id === r.categoryId)?.color ?? ["#16A085", "#7CC7E7", "#EAC45B", "#BB6BD9"][i % 4]) }} />)}</div>
        <ul className="plan-breakdown">{rows.map(r => { const c = categories.find(c => c.id === r.categoryId); return <li key={r.key}><span><i style={{ backgroundColor: getCategoryColor(c?.color ?? null) }} />{c?.name ?? tr("Selecciona una categoría")}</span><strong className="money-value">{formatMoney(fromUnits(draftUnits(r.amount)), plan.currency)}</strong></li>; })}</ul>
        <fieldset disabled={pending || archived} className="min-w-0"><div className="plan-settings"><div className="account-field"><label htmlFor="monthly-name">{tr("Nombre")}</label><input id="monthly-name" name="name" className="auth-input" maxLength={100} value={name} onChange={e => setName(e.target.value)} {...attrs("name")} /></div><div className="account-field"><label htmlFor="monthly-limit">{tr("Límite mensual")}</label><input id="monthly-limit" name="amount" className="auth-input" inputMode="decimal" maxLength={20} value={amount} onChange={e => setAmount(e.target.value)} {...attrs("amount")} /></div><div className="account-field"><label htmlFor="monthly-income">{tr("Ingreso mensual estimado")}</label><input id="monthly-income" name="expectedIncome" className="auth-input" inputMode="decimal" maxLength={20} placeholder={tr("Opcional")} value={income} onChange={e => setIncome(e.target.value)} {...attrs("expectedIncome")} /></div></div>
          <h3 className="mt-7 text-base font-bold">{tr("Ajusta tus categorías")}</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{tr("Mueve los controles o escribe un importe exacto. La suma de los límites no puede superar el límite mensual.")}</p>
          <div className="plan-allocation-editor">{rows.map((r, i) => { const selected = categories.find(c => c.id === r.categoryId); return <div className="plan-allocation-row" key={r.key}><div className="flex items-center gap-3"><label className="min-w-0 flex-1"><span className="sr-only">{tr("Categoría ")}{i + 1}</span><select className="auth-input" aria-label={msg`Categoría ${i + 1}`} value={r.categoryId} onChange={e => changeRow(r.key, { categoryId: e.target.value })}><option value="">{tr("Selecciona una categoría")}</option>{selected && !selected.isActive && <option value={selected.id} disabled>{selected.name} {tr("(inactiva)")}</option>}{active.map(c => <option value={c.id} key={c.id} disabled={rows.some(other => other.key !== r.key && other.categoryId === c.id)}>{c.name}</option>)}</select></label><button type="button" className="icon-button" aria-label={msg`Quitar categoría ${i + 1}`} onClick={() => setRows(rows.filter(other => other.key !== r.key))}><Icon name="close" /></button></div>
            <div className="plan-slider-row"><input type="range" min={0} max={1000} step={1} value={Math.round(allocationWidth(r.amount, amount) * 10)} aria-label={msg`Ajustar límite de ${selected?.name ?? `categoría ${i + 1}`}`} aria-valuetext={formatMoney(fromUnits(draftUnits(r.amount)), plan.currency)} onChange={e => changeRow(r.key, { amount: rangeAmount(amount, Number(e.target.value)) })} /><label className="min-w-0"><span className="sr-only">{tr("Límite categoría ")}{i + 1}</span><input className="auth-input" aria-label={msg`Límite categoría ${i + 1}`} inputMode="decimal" maxLength={20} value={r.amount} onChange={e => changeRow(r.key, { amount: e.target.value })} /></label></div>
            {selected && !selected.isActive && <p className="field-error mt-2">{tr("Reactiva esta categoría o quítala de la distribución antes de guardar.")}</p>}
          </div>; })}</div>
          {!rows.length && <p className="account-note mt-4">{tr("El presupuesto está creado. Añade tu primera categoría para comenzar a repartirlo.")}</p>}
          <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="button button-secondary gap-2" disabled={rows.length >= 100} onClick={() => setRows([...rows, { key: crypto.randomUUID(), categoryId: "", amount: "" }])}><Icon name="plus" />{tr("Añadir categoría")}</button><button type="button" className="category-text-button" onClick={() => setPanel({ kind: "category", id: crypto.randomUUID() })}>{tr("Crear categoría nueva")}</button></div>
          {summary.over && <p role="alert" className="account-alert mt-4">{tr("La distribución supera el límite mensual. Ajusta los importes antes de guardar.")}</p>}
          <div className="plan-save"><p>{tr("Estas cifras son una proyección, no movimientos reales. El ahorro se calcula como ingreso estimado menos gastos planificados.")}</p>{!archived && <button className="button button-primary" disabled={!dirty || pending || summary.over}>{pending ? tr("Guardando…") : tr("Guardar distribución")}</button>}</div>
        </fieldset>
      </section>
    </form>
    <section className="mt-9" aria-labelledby="actual-categories-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="actual-categories-title" className="text-xl font-bold">{tr("Progreso real por categoría")}</h2><button className="category-text-button" disabled={dirty || pending} onClick={() => router.refresh()}>{tr("Actualizar progreso")}</button></div>
      <div className="budgets-grid">{budgets.map(b => { const p = budgetProgress(b.amount, b.spent); return <article className={`budget-card budget-${p.level}`} key={b.id} aria-label={msg`Progreso de ${b.categoryName}`}><div className="flex items-center gap-3"><span className="category-symbol" style={{ backgroundColor: `${getCategoryColor(b.categoryColor)}22` }}><CategoryIcon name={b.categoryIcon} /></span><h3 className="break-words font-bold">{b.categoryName}</h3></div><p className="budget-card-amount money-value">{formatMoney(b.spent, plan.currency)} <span>/ {formatMoney(b.amount, plan.currency)}</span></p><div className="budget-progress-track" role="progressbar" aria-label={b.categoryName} aria-valuenow={p.bar} aria-valuemin={0} aria-valuemax={100} aria-valuetext={msg`${p.percent}% utilizado`}><span style={{ width: `${p.bar}%` }} /></div><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs"><span>{formatNumber(p.percent)}{tr("% usado")}</span><span className="budget-health">{tr(p.label)}</span></div><dl className="budget-remaining mb-5"><dt>{tr("Disponible")}</dt><dd className="money-value">{formatMoney(p.available, plan.currency)}</dd>{p.excess !== "0.0000" && <><dt>{tr("Excedido")}</dt><dd className="budget-excess money-value">{formatMoney(p.excess, plan.currency)}</dd></>}</dl></article>; })}</div>
      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{tr("Las tarjetas muestran la distribución guardada. Quitar una categoría del plan no elimina sus movimientos. Zona horaria: ")}{detail.timezone}.</p>
    </section>
    {panel?.kind === "copy" && <PlanDialog id={panel.id} requestId={panel.requestId} source={plan} month={nextMonth(plan.month)} currency={plan.currency} onClose={() => setPanel(null)} onSaved={copied} />}
    {panel?.kind === "status" && <PlanStatusDialog plan={plan} onClose={() => setPanel(null)} onSaved={statusSaved} />}
    {panel?.kind === "category" && <CategoryEditor id={panel.id} defaultType="expense" onClose={() => setPanel(null)} onSaved={categorySaved} />}
  </>;
}
