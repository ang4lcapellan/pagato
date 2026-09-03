"use client";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { CURRENCIES } from "@/modules/accounts/model";
import { initialPlanState, monthlyName, type Plan } from "../model";
import { copyPlanAction, savePlanAction, changePlanStatusAction } from "../actions";
export function PlanDialog({ id, requestId, month, currency, source, onClose, onSaved }: {
  id: string; requestId: string; month: string; currency: string; source?: Plan; onClose: () => void; onSaved: (id: string) => void;
}) {
  const [values, setValues] = useState({ name: monthlyName(month), month, currency: currency in CURRENCIES ? currency : "DOP", amount: "", expectedIncome: "" });
  const [state, action, pending] = useActionState(source ? copyPlanAction : savePlanAction, initialPlanState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.status === "success" && state.id) onSaved(state.id); }, [state, onSaved]);
  useEffect(() => { if (state.status === "error" && !pending) (form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>('[role="alert"]'))?.focus(); }, [state, pending]);
  const error = (name: string) => state.fields?.[name]?.[0];
  const attrs = (name: string) => ({ "aria-invalid": Boolean(error(name)), "aria-describedby": error(name) ? `plan-${name}-error` : undefined });
  const message = (name: string) => error(name) && <p className="field-error" id={`plan-${name}-error`}>{error(name)}</p>;
  return <Modal title={source ? "Copiar presupuesto" : "Nuevo presupuesto mensual"} onClose={onClose} busy={pending}>
    <p className="mb-5 text-sm leading-6 text-[var(--muted)]">{source ? `Usa «${source.name}» como plantilla. Copiaremos el límite, el ingreso estimado y las categorías con sus importes, no sus gastos.` : "Primero define tu mes y límite total. Después podrás repartirlo entre las categorías que elijas."}</p>
    <form ref={form} noValidate onSubmit={e => { e.preventDefault(); if (!pending) { const data = new FormData(e.currentTarget); startTransition(() => action(data)); } }}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="requestId" value={requestId} />
      {source ? <><input type="hidden" name="sourceId" value={source.id} /><input type="hidden" name="sourceVersion" value={source.version} /></> : <><input type="hidden" name="mode" value="create" /><input type="hidden" name="allocations" value="[]" /></>}
      {state.status === "error" && <p role="alert" tabIndex={-1} className="account-alert mb-4">{state.message}</p>}
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        <div className="account-field"><label htmlFor="plan-month">Mes del presupuesto</label><input className="auth-input" id="plan-month" name="month" type="month" min="0001-01" max="9999-12" value={values.month} onChange={e => setValues({ ...values, month: e.target.value, name: e.target.value ? monthlyName(e.target.value) : "" })} {...attrs("month")} />{message("month")}</div>
        <div className="account-field"><label htmlFor="plan-name">Nombre del presupuesto</label><input className="auth-input" id="plan-name" name="name" maxLength={100} value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} {...attrs("name")} />{message("name")}</div>
        {!source && <>
          <div className="account-field"><label htmlFor="plan-currency">Moneda</label><select className="auth-input" id="plan-currency" name="currency" value={values.currency} onChange={e => setValues({ ...values, currency: e.target.value })}>{Object.entries(CURRENCIES).map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}</select></div>
          <div className="account-field"><label htmlFor="plan-limit">Límite mensual</label><input className="auth-input" id="plan-limit" name="amount" inputMode="decimal" maxLength={20} placeholder="Ej. 22500" value={values.amount} onChange={e => setValues({ ...values, amount: e.target.value })} {...attrs("amount")} />{message("amount")}</div>
          <div className="account-field"><label htmlFor="plan-income">Ingreso mensual estimado (opcional)</label><input className="auth-input" id="plan-income" name="expectedIncome" inputMode="decimal" maxLength={20} placeholder="Ej. 30000" value={values.expectedIncome} onChange={e => setValues({ ...values, expectedIncome: e.target.value })} {...attrs("expectedIncome")} />{message("expectedIncome")}<p className="field-help">Solo se usa para proyectar el ahorro. No registra un ingreso ni cambia tus cuentas.</p></div>
        </>}
        <p className="field-help">Un presupuesto activo por mes y moneda. Los gastos que ya existan en el mes de destino se reflejarán automáticamente.</p>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button className="button button-primary">{pending ? "Guardando…" : source ? "Copiar al nuevo mes" : "Crear presupuesto mensual"}</button></div>
      </fieldset>
    </form>
  </Modal>;
}
export function PlanStatusDialog({ plan, onClose, onSaved }: { plan: Plan; onClose: () => void; onSaved: () => void }) {
  const [state, action, pending] = useActionState(changePlanStatusAction, initialPlanState);
  const archive = plan.status === "active";
  useEffect(() => { if (state.status === "success") onSaved(); }, [state, onSaved]);
  return <Modal title={archive ? "Archivar presupuesto mensual" : "Reactivar presupuesto mensual"} onClose={onClose} busy={pending}>
    <p className="break-words text-sm leading-6">{archive ? `«${plan.name}» pasará a Archivados. Se conservarán su distribución y sus movimientos.` : "No puede existir otro presupuesto activo para el mismo mes y moneda."}</p>
    <form action={action}><input type="hidden" name="id" value={plan.id} /><input type="hidden" name="version" value={plan.version} /><input type="hidden" name="status" value={archive ? "archived" : "active"} />
      {state.status === "error" && <p role="alert" className="account-alert mt-4">{state.message}</p>}
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={pending}>Cancelar</button><button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : archive ? "Archivar" : "Reactivar"}</button></div>
    </form>
  </Modal>;
}
