"use client";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { CURRENCIES } from "@/modules/accounts/model";
import type { Category } from "@/modules/categories/model";
import { initialBudgetState, monthPeriod, type Budget } from "../model";
import { saveBudgetAction } from "../server/actions";

export function BudgetEditor({ id, budget, categories, month, currency, onClose, onSaved }: {
  id: string; budget?: Budget; categories: Category[]; month: string; currency: string;
  onClose: () => void; onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(saveBudgetAction, initialBudgetState);
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ name: budget?.name ?? "", categoryId: budget?.categoryId ?? "",
    amount: budget?.amount ?? "", currency: budget?.currency ?? (currency in CURRENCIES ? currency : "DOP"),
    ...(budget ? { periodStart: budget.periodStart, periodEnd: budget.periodEnd } : monthPeriod(month)) });
  const available = categories.filter(c => c.isActive && c.categoryType === "expense");
  const categoryMissing = Boolean(values.categoryId) && !available.some(c => c.id === values.categoryId);
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Presupuesto guardado."); }, [state, onSaved]);
  useEffect(() => { if (state.status === "error" && !pending) (form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>('[role="alert"]'))?.focus(); }, [state, pending]);
  const error = (field: string) => state.fields?.[field]?.[0];
  const attrs = (field: string) => ({ "aria-invalid": Boolean(error(field)), "aria-describedby": error(field) ? `budget-${field}-error` : undefined });
  const message = (field: string) => error(field) ? <p className="field-error" id={`budget-${field}-error`}>{error(field)}</p> : null;
  return <Modal title={budget ? "Editar presupuesto" : "Nuevo presupuesto"} onClose={onClose} busy={pending} className="transaction-modal">
    <p className="mb-6 text-sm leading-6 text-[var(--muted)]">Ponle un límite a tus gastos. Incluiremos los movimientos de la categoría, moneda y período que elijas.</p>
    {!available.length ? <div className="account-note">Necesitas una categoría de gasto activa para crear un presupuesto.<Link href="/categories" className="button button-secondary mt-4">Gestionar categorías</Link></div> :
    <form ref={form} noValidate onSubmit={event => { event.preventDefault(); if (!pending) { const data = new FormData(event.currentTarget); startTransition(() => action(data)); } }}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="mode" value={budget ? "edit" : "create"} />
      {budget && <input type="hidden" name="revision" value={budget.revision} />}
      {state.status === "error" && <p role="alert" tabIndex={-1} className="account-alert mb-5">{state.message}</p>}
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        <div className="account-field"><label htmlFor="budget-name">Nombre del presupuesto</label><input id="budget-name" name="name" className="auth-input" maxLength={100} placeholder="Ej. Alimentación del mes" value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} {...attrs("name")} />{message("name")}</div>
        <div className="account-field"><label htmlFor="budget-category">Categoría de gasto</label><select id="budget-category" name="categoryId" className="auth-input" value={values.categoryId} onChange={e => setValues({ ...values, categoryId: e.target.value })} {...attrs("categoryId")}><option value="">Selecciona una categoría</option>{categoryMissing && <option value={values.categoryId} disabled>{budget?.categoryName ?? "Categoría"} (inactiva)</option>}{available.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{message("categoryId")}{categoryMissing && <p className="field-help">Selecciona una categoría activa o reactiva la anterior desde Ajustes.</p>}</div>
        <div className="account-field"><label htmlFor="budget-currency">Moneda</label><select id="budget-currency" name="currency" className="auth-input" value={values.currency} onChange={e => setValues({ ...values, currency: e.target.value })} {...attrs("currency")}>{Object.entries(CURRENCIES).map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}</select>{message("currency")}</div>
        <div className="account-field"><label htmlFor="budget-amount">Límite de gasto</label><input id="budget-amount" name="amount" className="auth-input transaction-amount-input" inputMode="decimal" maxLength={20} placeholder="0.00" value={values.amount} onChange={e => setValues({ ...values, amount: e.target.value })} {...attrs("amount")} />{message("amount")}<p className="field-help">Sin separadores de miles. No convertimos gastos entre monedas.</p></div>
        <div className="budget-date-fields"><div className="account-field"><label htmlFor="budget-start">Fecha inicial</label><input id="budget-start" name="periodStart" type="date" min="0001-01-01" max="9999-12-31" className="auth-input" value={values.periodStart} onChange={e => setValues({ ...values, periodStart: e.target.value })} {...attrs("periodStart")} />{message("periodStart")}</div>
        <div className="account-field"><label htmlFor="budget-end">Fecha final</label><input id="budget-end" name="periodEnd" type="date" min="0001-01-01" max="9999-12-31" className="auth-input" value={values.periodEnd} onChange={e => setValues({ ...values, periodEnd: e.target.value })} {...attrs("periodEnd")} />{message("periodEnd")}</div></div>
        <p className="account-note">Ambos días están incluidos. El progreso se actualiza al registrar, editar o eliminar un gasto. No incluye ingresos ni transferencias.</p>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary">{pending ? "Guardando…" : budget ? "Guardar cambios" : "Crear presupuesto"}</button></div>
      </fieldset>
    </form>}
  </Modal>;
}
