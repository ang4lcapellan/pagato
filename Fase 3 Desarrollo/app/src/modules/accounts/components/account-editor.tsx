"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ACCOUNT_COLORS, ACCOUNT_TYPES, CURRENCIES, initialAccountState, type FinancialAccount } from "../model";
import { saveAccountAction } from "../server/actions";

export function AccountEditor({ account, id, defaultCurrency, onClose, onSaved }: { account?: FinancialAccount; id: string; defaultCurrency: string; onClose: () => void; onSaved: (message: string) => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(saveAccountAction, initialAccountState);
  const [values, setValues] = useState({
    name: account?.name ?? "", accountType: account?.accountType ?? "bank", currency: account?.currency ?? defaultCurrency,
    openingBalance: account?.openingBalance ?? "0", creditLimit: account?.creditLimit ?? "",
    institution: account?.institution ?? "", description: account?.description ?? "", color: account?.color ?? ACCOUNT_COLORS[0],
  });
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Cuenta guardada."); }, [state, onSaved]);
  useEffect(() => {
    if (state.status === "error") {
      const target = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>('[role="alert"]');
      target?.focus();
    }
  }, [state]);
  const change = (field: keyof typeof values, value: string) => setValues((previous) => ({ ...previous, [field]: value }));
  const error = (field: string) => state.fields?.[field]?.[0];
  const attrs = (field: string) => ({ "aria-invalid": Boolean(error(field)), "aria-describedby": error(field) ? `${field}-error` : undefined });
  const message = (field: string) => error(field) ? <span id={`${field}-error`} className="field-error">{error(field)}</span> : null;
  const locked = account?.hasTransactions ?? false;

  return <Modal title={account ? "Editar cuenta" : "Nueva cuenta"} onClose={onClose} busy={pending}>
    <p className="mb-6 text-sm leading-6 text-[var(--muted)]">Dale un espacio a tu dinero. No necesitas compartir números de cuenta ni datos de acceso bancario.</p>
    <form ref={form} className="space-y-5" noValidate onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const data = new FormData(event.currentTarget);
      // Dispatch explicitly so React's action-form reset does not clear rejected input.
      startTransition(() => action(data));
    }}>
      <input type="hidden" name="mode" value={account ? "edit" : "create"} />
      <input type="hidden" name="id" value={id} />
      {account && <input type="hidden" name="revision" value={account.revision} />}
      {state.status === "error" && <p role="alert" tabIndex={-1} className="account-alert">{state.message}</p>}
      <label className="account-field">Nombre de la cuenta<input className="auth-input" name="name" placeholder="Ej. Cuenta principal" value={values.name} onChange={(e) => change("name", e.target.value)} maxLength={100} required {...attrs("name")} />{message("name")}</label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="account-field">Tipo de cuenta<select className="auth-input" name={locked ? undefined : "accountType"} value={values.accountType} onChange={(e) => change("accountType", e.target.value)} disabled={locked} {...attrs("accountType")}>{Object.entries(ACCOUNT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{message("accountType")}</label>
        <label className="account-field">Moneda<select className="auth-input" name={locked ? undefined : "currency"} value={values.currency} onChange={(e) => change("currency", e.target.value)} disabled={locked} {...attrs("currency")}>{Object.entries(CURRENCIES).map(([value, label]) => <option key={value} value={value}>{value} · {label}</option>)}</select>{message("currency")}</label>
      </div>
      {locked && <><input type="hidden" name="accountType" value={values.accountType} /><input type="hidden" name="currency" value={values.currency} /><p className="account-note">Esta cuenta tiene movimientos. El tipo, la moneda y el saldo inicial no se pueden cambiar para conservar su historial.</p></>}
      <label className="account-field">Saldo inicial ({values.currency})<input className="auth-input" name="openingBalance" inputMode="decimal" value={values.openingBalance} onChange={(e) => change("openingBalance", e.target.value)} readOnly={locked} required {...attrs("openingBalance")} />{message("openingBalance")}<span className="field-help">Escribe el saldo al comenzar, sin separadores de miles. Ejemplo: 2500.50. Para una deuda, usa un saldo negativo.</span></label>
      {values.accountType === "credit_card" ? <label className="account-field">Límite de crédito (opcional)<input className="auth-input" name="creditLimit" inputMode="decimal" placeholder="Ej. 50000" value={values.creditLimit} onChange={(e) => change("creditLimit", e.target.value)} {...attrs("creditLimit")} />{message("creditLimit")}<span className="field-help">No se suma a tu saldo: es el límite autorizado de la tarjeta.</span></label> : <input type="hidden" name="creditLimit" value="" />}
      <label className="account-field">Institución (opcional)<input className="auth-input" name="institution" placeholder="Ej. Banco Popular" value={values.institution} onChange={(e) => change("institution", e.target.value)} maxLength={120} {...attrs("institution")} />{message("institution")}</label>
      <fieldset><legend className="mb-2 text-sm font-semibold">Color de la cuenta</legend><div className="flex flex-wrap gap-2">{ACCOUNT_COLORS.map((color, index) => <label key={color} className="color-option" style={{ "--account-color": color } as React.CSSProperties}><input type="radio" name="color" value={color} checked={values.color.toUpperCase() === color} onChange={() => change("color", color)} aria-label={`Color ${index + 1}`} /><span aria-hidden="true" /></label>)}</div>{message("color")}</fieldset>
      <label className="account-field">Descripción (opcional)<textarea className="auth-input min-h-24 resize-y" name="description" placeholder="¿Para qué usarás esta cuenta?" value={values.description} onChange={(e) => change("description", e.target.value)} maxLength={500} {...attrs("description")} />{message("description")}</label>
      <div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose} disabled={pending}>Cancelar</button><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Guardando…" : account ? "Guardar cambios" : "Crear cuenta"}</button></div>
    </form>
  </Modal>;
}
