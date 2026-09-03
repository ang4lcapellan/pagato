"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icon";

export function Modal({ title, onClose, busy = false, children, className = "" }: { title: string; onClose: () => void; busy?: boolean; children: ReactNode; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className={`account-modal ${className}`} aria-labelledby="modal-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="modal-heading"><h2 id="modal-title" tabIndex={-1} autoFocus className="text-xl font-bold">{title}</h2><button type="button" className="icon-button" aria-label="Cerrar ventana" onClick={onClose} disabled={busy}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}
