"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";

import { initialTransactionState, TRANSACTION_TYPES, type Transaction } from "../model";
import { deleteTransactionAction } from "../server/actions";

export function TransactionAmount({ transaction: t }: { transaction: Transaction }) {
  const { formatMoney } = usePresentation();
  return <span className={`transaction-money transaction-money-${t.type}`}>
    {t.sourceAmount && t.sourceCurrency && <span>− {formatMoney(t.sourceAmount, t.sourceCurrency)}</span>}
    {t.destinationAmount && t.destinationCurrency && <span>+ {formatMoney(t.destinationAmount, t.destinationCurrency)}</span>}
  </span>;
}
export function TransactionDetail({ transaction: t, timezone, onClose, onEdit, onDelete }: { transaction: Transaction; timezone: string; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const { t: tr, formatDate } = usePresentation();
  return <Modal title={tr("Detalle de transacción")} onClose={onClose}>
    <div className="transaction-detail-hero"><p className="text-xs font-semibold uppercase tracking-wider">{tr(TRANSACTION_TYPES[t.type])}</p><div className="mt-3 text-2xl font-bold"><TransactionAmount transaction={t} /></div><p className="mt-3 break-words font-semibold">{t.description || tr("Sin descripción")}</p></div>
    <dl className="account-detail-list mt-6">
      <dt>{tr("Fecha y hora")}</dt><dd>{`${formatDate(t.occurredLocal)} ${t.occurredLocal.slice(11, 16)}`}<small className="block font-normal">{timezone.replaceAll("_", " ")}</small></dd>
      {t.sourceName && <><dt>{t.type === "transfer" ? tr("Origen") : tr("Cuenta")}</dt><dd>{t.sourceName}</dd></>}
      {t.destinationName && <><dt>{t.type === "transfer" ? tr("Destino") : tr("Cuenta")}</dt><dd>{t.destinationName}</dd></>}
      {t.categoryName && <><dt>{tr("Categoría")}</dt><dd>{t.categoryName}</dd></>}
      <dt>{tr("Método de pago")}</dt><dd>{t.paymentMethod || tr("No indicado")}</dd><dt>{tr("Notas")}</dt><dd className="whitespace-pre-wrap">{t.notes || tr("Sin notas")}</dd>
    </dl>
    {t.type === "transfer" && <p className="account-note mt-6">{tr("Movimiento entre cuentas propias: no se suma a tus ingresos o gastos.")}</p>}
    <div className="modal-actions"><button type="button" className="button button-secondary transaction-delete-button" onClick={onDelete}>{tr("Eliminar")}</button><button type="button" className="button button-primary" onClick={onEdit}>{tr("Editar transacción")}</button></div>
  </Modal>;
}
export function TransactionDeleteDialog({ transaction, onClose, onSaved }: { transaction: Transaction; onClose: () => void; onSaved: (message: string) => void }) {
  const { t: tr } = usePresentation();
  const [state, action, pending] = useActionState(deleteTransactionAction, initialTransactionState);
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Transacción eliminada."); }, [state, onSaved]);
  return <Modal title={tr("¿Eliminar esta transacción?")} onClose={onClose} busy={pending}>
    <p className="break-words font-semibold">{transaction.description || tr(TRANSACTION_TYPES[transaction.type])}</p><div className="my-4 text-xl font-bold"><TransactionAmount transaction={transaction} /></div>
    <p className="text-sm leading-6 text-[var(--muted)]">{tr("Dejará de aparecer en el historial y se revertirá su efecto en ")}{transaction.type === "transfer" ? tr("ambas cuentas") : tr("el saldo de la cuenta")}{tr(". Se conserva el registro interno mediante eliminación lógica. No hay restauración desde esta pantalla.")}</p>
    <form action={action} className="mt-5"><input type="hidden" name="id" value={transaction.id} /><input type="hidden" name="version" value={transaction.version} />{state.status === "error" && <p role="alert" className="account-alert">{tr(state.message)}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" disabled={pending} data-modal-close>{tr("Conservar")}</button><button type="submit" className="button transaction-delete-confirm" disabled={pending}>{pending ? tr("Eliminando…") : tr("Confirmar eliminación")}</button></div></form>
  </Modal>;
}
