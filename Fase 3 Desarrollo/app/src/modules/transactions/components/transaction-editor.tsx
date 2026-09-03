"use client";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { formatMoney, type FinancialAccount } from "@/modules/accounts/model";
import type { Category } from "@/modules/categories/model";
import { initialTransactionState, localDateTime, TRANSACTION_TYPES, type Transaction, type TransactionType } from "../model";
import { saveTransactionAction } from "../server/actions";

export function TransactionEditor({ id, transaction, accounts, categories, timezone, onClose, onSaved }: {
  id: string; transaction?: Transaction; accounts: FinancialAccount[]; categories: Category[]; timezone: string;
  onClose: () => void; onSaved: (message: string) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(saveTransactionAction, initialTransactionState);
  const [values, setValues] = useState(() => ({
    type: transaction?.type ?? "expense" as TransactionType,
    sourceAccountId: transaction?.sourceAccountId ?? "", destinationAccountId: transaction?.destinationAccountId ?? "",
    amount: transaction?.sourceAmount ?? transaction?.destinationAmount ?? "", receivedAmount: transaction?.destinationAmount ?? "",
    categoryId: transaction?.categoryId ?? "", occurredLocal: transaction?.occurredLocal ?? localDateTime(new Date(), timezone),
    description: transaction?.description ?? "", notes: transaction?.notes ?? "", paymentMethod: transaction?.paymentMethod ?? "",
  }));
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Transacción guardada."); }, [state, onSaved]);
  useEffect(() => { if (state.status === "error") (form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>('[role="alert"]'))?.focus(); }, [state]);
  const set = (key: keyof typeof values, value: string) => setValues(previous => ({ ...previous, [key]: value }));
  const source = accounts.find(a => a.id === values.sourceAccountId);
  const destination = accounts.find(a => a.id === values.destinationAccountId);
  const currency = (values.type === "income" ? destination : source)?.currency;
  const foreignTransfer = values.type === "transfer" && source && destination && source.currency !== destination.currency;
  const needsAccount = !accounts.some(a => a.status === "active");
  const choices = categories.filter(c => c.categoryType === values.type);
  const attrs = (key: string) => ({ "aria-invalid": Boolean(state.fields?.[key]), "aria-describedby": state.fields?.[key] ? `tx-${key}-error` : undefined });
  const error = (key: string) => state.fields?.[key] ? <p id={`tx-${key}-error`} className="field-error">{state.fields[key][0]}</p> : null;
  const accountField = (key: "sourceAccountId" | "destinationAccountId", label: string) => <div className="account-field"><label htmlFor={`tx-${key}`}>{label}</label><select className="auth-input" id={`tx-${key}`} name={key} value={values[key]} onChange={e => set(key, e.target.value)} required {...attrs(key)}><option value="">Seleccionar cuenta</option>{accounts.filter(a => a.status === "active" || a.id === values[key]).map(a => <option key={a.id} value={a.id} disabled={a.status !== "active"}>{a.name} · {a.currency}{a.status !== "active" ? " (archivada)" : ""}</option>)}</select>{error(key)}{accounts.find(a => a.id === values[key]) && <p className="field-help">Saldo actual: {formatMoney(accounts.find(a => a.id === values[key])!.balance, accounts.find(a => a.id === values[key])!.currency)}</p>}</div>;

  return <Modal title={transaction ? "Editar transacción" : "Nueva transacción"} className="transaction-modal" busy={pending} onClose={onClose}>
    <p className="mb-6 text-sm leading-6 text-[var(--muted)]">{transaction ? "Los cambios recalculan los saldos de las cuentas involucradas." : "Registra lo que entra, lo que sale y lo que mueves entre tus cuentas."}</p>
    {needsAccount && <p className="account-note mb-5">Primero necesitas una cuenta activa. <Link href="/accounts" className="underline">Ir a mis cuentas</Link></p>}
    <form ref={form} noValidate onSubmit={event => {
      event.preventDefault(); if (pending) return;
      const data = new FormData(event.currentTarget);
      if (values.type === "transfer" && !foreignTransfer) data.set("receivedAmount", values.amount);
      startTransition(() => action(data));
    }}>
      <input type="hidden" name="mode" value={transaction ? "edit" : "create"} /><input type="hidden" name="id" value={id} />
      <input type="hidden" name="sourceCurrency" value={source?.currency ?? ""} /><input type="hidden" name="destinationCurrency" value={destination?.currency ?? ""} />
      {transaction && <input type="hidden" name="version" value={transaction.version} />}
      {state.status === "error" && <p className="account-alert mb-5" role="alert" tabIndex={-1}>{state.message}</p>}
      <fieldset className="min-w-0 space-y-5" disabled={pending}>
        <fieldset><legend className="mb-2 text-sm font-semibold">Tipo de movimiento</legend><div className="transaction-type-picker">{Object.entries(TRANSACTION_TYPES).map(([type, label]) => <label key={type}><input type="radio" name="type" value={type} checked={values.type === type} onChange={() => setValues(v => ({ ...v, type: type as TransactionType, categoryId: "" }))} /><span>{label === "Transferencia" ? "Transferir" : label}</span></label>)}</div></fieldset>
        <div className="account-field"><label htmlFor="tx-amount">{values.type === "transfer" ? "Monto enviado" : "Monto"}{currency ? ` (${currency})` : ""}</label><input id="tx-amount" name="amount" className="auth-input transaction-amount-input" inputMode="decimal" placeholder="0.00" maxLength={20} value={values.amount} onChange={e => set("amount", e.target.value)} required {...attrs("amount")} />{error("amount")}<p className="field-help">Sin separadores de miles. Se admiten hasta 4 decimales.</p></div>
        {values.type !== "income" && accountField("sourceAccountId", values.type === "transfer" ? "Cuenta de origen" : "Cuenta")}
        {values.type !== "expense" && accountField("destinationAccountId", values.type === "transfer" ? "Cuenta de destino" : "Cuenta")}
        {foreignTransfer ? <div className="account-field"><label htmlFor="tx-received">Monto recibido ({destination.currency})</label><input id="tx-received" name="receivedAmount" className="auth-input" inputMode="decimal" placeholder="0.00" value={values.receivedAmount} maxLength={20} onChange={e => set("receivedAmount", e.target.value)} required {...attrs("receivedAmount")} />{error("receivedAmount")}<p className="field-help">Escribe el importe real recibido. No se aplica una tasa de cambio automática.</p></div> : values.type === "transfer" && <p className="account-note">En la misma moneda se registra el mismo importe en ambas cuentas. La transferencia no se cuenta como ingreso ni gasto.</p>}
        {values.type !== "transfer" && <div className="account-field"><label htmlFor="tx-category">Categoría</label><select id="tx-category" className="auth-input" name="categoryId" value={values.categoryId} onChange={e => set("categoryId", e.target.value)} required {...attrs("categoryId")}><option value="">Seleccionar categoría</option>{choices.filter(c => c.isActive || c.id === values.categoryId).map(c => <option key={c.id} value={c.id} disabled={!c.isActive}>{c.name}{c.isActive ? "" : " (inactiva)"}</option>)}</select>{error("categoryId")}<p className="field-help">Usa cuentas y categorías activas. <Link href="/categories" className="underline">Gestionar categorías</Link></p></div>}
        <div className="account-field"><label htmlFor="tx-date">Fecha y hora</label><input id="tx-date" type="datetime-local" className="auth-input" name="occurredLocal" value={values.occurredLocal} onChange={e => set("occurredLocal", e.target.value)} required {...attrs("occurredLocal")} />{error("occurredLocal")}<p className="field-help">Zona horaria del perfil: {timezone.replaceAll("_", " ")}</p></div>
        <div className="account-field"><label htmlFor="tx-description">Descripción <span className="font-normal text-[var(--muted)]">(opcional)</span></label><input id="tx-description" name="description" className="auth-input" placeholder="Ej. Compra del supermercado" value={values.description} maxLength={240} onChange={e => set("description", e.target.value)} {...attrs("description")} />{error("description")}</div>
        <div className="account-field"><label htmlFor="tx-payment">Método de pago <span className="font-normal text-[var(--muted)]">(opcional)</span></label><input id="tx-payment" name="paymentMethod" className="auth-input" placeholder="Ej. Tarjeta, efectivo, transferencia" value={values.paymentMethod} maxLength={50} onChange={e => set("paymentMethod", e.target.value)} {...attrs("paymentMethod")} />{error("paymentMethod")}</div>
        <div className="account-field"><label htmlFor="tx-notes">Notas <span className="font-normal text-[var(--muted)]">(opcional)</span></label><textarea id="tx-notes" name="notes" className="auth-input" rows={3} value={values.notes} maxLength={1000} onChange={e => set("notes", e.target.value)} {...attrs("notes")} />{error("notes")}</div>
        <p className="field-help">Este registro no ejecuta pagos bancarios. Se permiten saldos negativos para reflejar deudas o movimientos pendientes de completar.</p>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" disabled={pending || needsAccount}>{pending ? "Guardando…" : "Guardar transacción"}</button></div>
      </fieldset>
    </form>
  </Modal>;
}
