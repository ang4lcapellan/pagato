"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icon";

export function Modal({ title, onClose, busy = false, children, className = "" }: { title: string; onClose: () => void; busy?: boolean; children: ReactNode; className?: string }) {
  const { t: tr } = usePresentation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishClose = () => {
    if (!closingRef.current) return;
    closingRef.current = false;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    onClose();
  };
  const requestClose = () => {
    if (busy || closingRef.current) return;
    const element = dialog.current;
    const duration = element ? parseFloat(getComputedStyle(element).getPropertyValue("--motion-exit")) || 0 : 0;
    if (!duration || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { onClose(); return; }
    closingRef.current = true;
    setClosing(true);
    // Keep the focus trap until the exit finishes, with a fallback if animationend is interrupted.
    closeTimer.current = setTimeout(finishClose, Math.min(duration, 1000) + 100);
  };
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      element?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} className={`account-modal ${className}`} aria-labelledby="modal-title" data-closing={closing || undefined} inert={closing}
    onCancel={(event) => { event.preventDefault(); requestClose(); }}
    onAnimationEnd={event => { if (event.target === event.currentTarget && event.animationName === "motion-modal-exit") finishClose(); }}
    onClickCapture={event => {
      // Footer cancel buttons share the same dismissal as Escape and the close icon.
      if (event.target instanceof Element && event.target.closest("[data-modal-close]")) {
        event.preventDefault(); event.stopPropagation(); requestClose();
      }
    }}>
    <div className="modal-heading"><h2 id="modal-title" tabIndex={-1} autoFocus className="text-xl font-bold">{title}</h2><button type="button" className="icon-button" aria-label={tr("Cerrar ventana")} onClick={requestClose} disabled={busy || closing}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}
