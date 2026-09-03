"use client";
import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/modules/accounts/model";
import { initialTransactionState, TRANSACTION_TYPES, type Transaction } from "../model";
import { deleteTransactionAction } from "../server/actions";

export function TransactionAmount({ transaction: t }: { transaction: Transaction }) {
  return <span className={`transaction-money transaction-money-${t.type}`}>
    {t.sourceAmount && t.sourceCurrency && <span>− {formatMoney(t.sourceAmount, t.sourceCurrency)}</span>}
    {t.destinationAmount && t.destinationCurrency && <span>+ {formatMoney(t.destinationAmount, t.destinationCurrency)}</span>}
  </span>;
}
export function TransactionDetail({ transaction: t, timezone, onClose, onEdit, onDelete }: { transaction: Transaction; timezone: string; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  return <Modal title="Detalle de transacción" onClose={onClose}>
    <div className="transaction-detail-hero"><p className="text-xs font-semibold uppercase tracking-wider">{TRANSACTION_TYPES[t.type]}</p><div className="mt-3 text-2xl font-bold"><TransactionAmount transaction={t} /></div><p className="mt-3 break-words font-semibold">{t.description || "Sin descripción"}</p></div>
    <dl className="account-detail-list mt-6">
      <dt>Fecha y hora</dt><dd>{t.occurredLocal.replace("T", " ")}<small className="block font-normal">{timezone.replaceAll("_", " ")}</small></dd>
      {t.sourceName && <><dt>{t.type === "transfer" ? "Origen" : "Cuenta"}</dt><dd>{t.sourceName}</dd></>}
      {t.destinationName && <><dt>{t.type === "transfer" ? "Destino" : "Cuenta"}</dt><dd>{t.destinationName}</dd></>}
      {t.categoryName && <><dt>Categoría</dt><dd>{t.categoryName}</dd></>}
      <dt>Método de pago</dt><dd>{t.paymentMethod || "No indicado"}</dd><dt>Notas</dt><dd className="whitespace-pre-wrap">{t.notes || "Sin notas"}</dd>
    </dl>
    {t.type === "transfer" && <p className="account-note mt-6">Movimiento entre cuentas propias: no se suma a tus ingresos o gastos.</p>}
    <div className="modal-actions"><button type="button" className="button button-secondary transaction-delete-button" onClick={onDelete}>Eliminar</button><button type="button" className="button button-primary" onClick={onEdit}>Editar transacción</button></div>
  </Modal>;
}
export function TransactionDeleteDialog({ transaction, onClose, onSaved }: { transaction: Transaction; onClose: () => void; onSaved: (message: string) => void }) {
  const [state, action, pending] = useActionState(deleteTransactionAction, initialTransactionState);
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Transacción eliminada."); }, [state, onSaved]);
  return <Modal title="¿Eliminar esta transacción?" onClose={onClose} busy={pending}>
    <p className="break-words font-semibold">{transaction.description || TRANSACTION_TYPES[transaction.type]}</p><div className="my-4 text-xl font-bold"><TransactionAmount transaction={transaction} /></div>
    <p className="text-sm leading-6 text-[var(--muted)]">Dejará de aparecer en el historial y se revertirá su efecto en {transaction.type === "transfer" ? "ambas cuentas" : "el saldo de la cuenta"}. Se conserva el registro interno mediante eliminación lógica. No hay restauración desde esta pantalla.</p>
    <form action={action} className="mt-5"><input type="hidden" name="id" value={transaction.id} /><input type="hidden" name="version" value={transaction.version} />{state.status === "error" && <p role="alert" className="account-alert">{state.message}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" disabled={pending} onClick={onClose}>Conservar</button><button type="submit" className="button transaction-delete-confirm" disabled={pending}>{pending ? "Eliminando…" : "Confirmar eliminación"}</button></div></form>
  </Modal>;
}
