"use client";
import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { initialBudgetState, type Budget } from "../model";
import { changeBudgetStatusAction } from "../server/actions";
export function BudgetStatusDialog({ budget, onClose, onSaved }: { budget: Budget; onClose: () => void; onSaved: (message: string) => void }) {
  const [state, action, pending] = useActionState(changeBudgetStatusAction, initialBudgetState);
  const archive = budget.status === "active";
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Estado actualizado."); }, [state, onSaved]);
  return <Modal title={archive ? "Archivar presupuesto" : "Reactivar presupuesto"} onClose={onClose} busy={pending}>
    <p className="break-words text-sm leading-6">{archive ? `¿Archivar «${budget.name}»? Podrás consultarlo en Archivados. Tus gastos y saldos no se modificarán.` : `¿Reactivar «${budget.name}»? La categoría debe estar activa y no puede solaparse con otro presupuesto de la misma categoría y moneda.`}</p>
    <form action={action}><input type="hidden" name="id" value={budget.id} /><input type="hidden" name="revision" value={budget.revision} /><input type="hidden" name="status" value={archive ? "archived" : "active"} />
      {state.status === "error" && <p role="alert" className="account-alert mt-4">{state.message}</p>}
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={pending}>Cancelar</button><button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : archive ? "Archivar" : "Reactivar"}</button></div>
    </form>
  </Modal>;
}
