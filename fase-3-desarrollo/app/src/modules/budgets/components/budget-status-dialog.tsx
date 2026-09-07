"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { initialBudgetState, type Budget } from "../model";
import { changeBudgetStatusAction } from "../server/actions";
export function BudgetStatusDialog({ budget, onClose, onSaved }: { budget: Budget; onClose: () => void; onSaved: (message: string) => void }) {
  const { t: tr, message: msg } = usePresentation();
  const [state, action, pending] = useActionState(changeBudgetStatusAction, initialBudgetState);
  const archive = budget.status === "active";
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Estado actualizado."); }, [state, onSaved]);
  return <Modal title={archive ? tr("Archivar presupuesto") : tr("Reactivar presupuesto")} onClose={onClose} busy={pending}>
    <p className="break-words text-sm leading-6">{archive ? msg`¿Archivar «${budget.name}»? Podrás consultarlo en Archivados. Tus gastos y saldos no se modificarán.` : msg`¿Reactivar «${budget.name}»? La categoría debe estar activa y no puede solaparse con otro presupuesto de la misma categoría y moneda.`}</p>
    <form action={action}><input type="hidden" name="id" value={budget.id} /><input type="hidden" name="revision" value={budget.revision} /><input type="hidden" name="status" value={archive ? "archived" : "active"} />
      {state.status === "error" && <p role="alert" className="account-alert mt-4">{tr(state.message)}</p>}
      <div className="modal-actions"><button type="button" className="button button-secondary" data-modal-close disabled={pending}>{tr("Cancelar")}</button><button className="button button-primary" disabled={pending}>{pending ? tr("Guardando…") : archive ? tr("Archivar") : tr("Reactivar")}</button></div>
    </form>
  </Modal>;
}
