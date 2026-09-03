"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { initialCategoryState, type Category } from "../model";
import { changeCategoryStatusAction } from "../server/actions";

export function CategoryStatusDialog({ category, onClose, onSaved }: { category: Category; onClose: () => void; onSaved: (message: string) => void }) {
  const [state, action, pending] = useActionState(changeCategoryStatusAction, initialCategoryState);
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Estado actualizado."); }, [state, onSaved]);
  return <Modal title={category.isActive ? "Desactivar categoría" : "Reactivar categoría"} onClose={onClose} busy={pending}>
    <p className="break-words text-lg font-semibold">{category.name}</p>
    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{category.isActive ? "Dejará de estar disponible para nuevos movimientos y presupuestos. Los registros existentes se conservan. Podrás reactivarla cuando quieras." : "Volverá a estar disponible para clasificar nuevos movimientos. No se creará otra categoría ni se modificará tu historial."}</p>
    {state.status === "error" && <p role="alert" className="account-alert mt-5">{state.message}</p>}
    <form action={action}>
      <input type="hidden" name="id" value={category.id} /><input type="hidden" name="revision" value={category.revision} /><input type="hidden" name="status" value={category.isActive ? "inactive" : "active"} />
      <div className="modal-actions"><button className="button button-secondary" type="button" disabled={pending} onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={pending}>{pending ? "Actualizando…" : category.isActive ? "Confirmar desactivación" : "Confirmar reactivación"}</button></div>
    </form>
  </Modal>;
}
