"use client";
import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { ACCOUNT_TYPES, formatMoney, fromUnits, initialAccountState, toUnits, type FinancialAccount } from "../model";
import { changeAccountStatusAction } from "../server/actions";

export function AccountDetail({ account, onClose, onEdit, onSaved }: { account: FinancialAccount; onClose: () => void; onEdit: () => void; onSaved: (message: string) => void }) {
  const [state, action, pending] = useActionState(changeAccountStatusAction, initialAccountState);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Estado actualizado."); }, [state, onSaved]);
  const archived = account.status === "archived";
  return <Modal title="Detalle de cuenta" onClose={onClose} busy={pending}>
    <div className="flex items-center gap-4"><span className="account-symbol" style={{ background: account.color ?? "#0B6B58" }}><Icon name="wallet" /></span><div className="min-w-0"><h3 className="break-words text-xl font-bold">{account.name}</h3><p className="mt-1 text-sm text-[var(--muted)]">{ACCOUNT_TYPES[account.accountType]}</p></div></div>
    <div className="my-6 rounded-2xl bg-[var(--surface)] p-5"><p className="text-sm text-[var(--muted)]">Saldo actual · {account.currency}</p><p className="money-value mt-2 text-3xl font-bold">{formatMoney(account.balance, account.currency)}</p></div>
    <dl className="account-detail-list">
      <dt>Estado</dt><dd>{archived ? "Archivada" : "Activa"}</dd>
      <dt>Saldo inicial</dt><dd className="money-value">{formatMoney(account.openingBalance, account.currency)}</dd>
      <dt>Institución</dt><dd>{account.institution || "Sin institución"}</dd>
      {account.creditLimit !== null && <><dt>Límite de crédito</dt><dd className="money-value">{formatMoney(account.creditLimit, account.currency)}</dd><dt>Disponible estimado</dt><dd className="money-value">{formatMoney(fromUnits(toUnits(account.creditLimit) + toUnits(account.balance)), account.currency)}</dd></>}
    </dl>
    {account.description && <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted)]">{account.description}</p>}
    {state.status === "error" && <p className="account-alert mt-5" role="alert">{state.message}</p>}
    {confirming ? <form action={action} className="mt-6 border-t border-[var(--border)] pt-5">
      <input type="hidden" name="id" value={account.id} /><input type="hidden" name="revision" value={account.revision} /><input type="hidden" name="status" value={archived ? "active" : "archived"} />
      <p className="text-sm leading-6">{archived ? "La cuenta volverá a mostrarse entre tus cuentas activas y a incluirse en sus totales." : "La cuenta dejará de incluirse en los totales activos. Su historial se conserva y podrás reactivarla cuando quieras."}</p>
      <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setConfirming(false)} disabled={pending}>Cancelar</button><button className="button button-primary" disabled={pending}>{pending ? "Actualizando…" : archived ? "Confirmar reactivación" : "Confirmar archivo"}</button></div>
    </form> : <div className="modal-actions"><button className="button button-secondary gap-2" type="button" onClick={() => setConfirming(true)}><Icon name="archive" />{archived ? "Reactivar cuenta" : "Archivar cuenta"}</button><button className="button button-primary gap-2" type="button" onClick={onEdit}><Icon name="edit" />Editar cuenta</button></div>}
  </Modal>;
}
