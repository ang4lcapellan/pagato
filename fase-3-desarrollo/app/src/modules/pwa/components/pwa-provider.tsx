"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type Status = "checking" | "ready" | "development" | "insecure" | "unsupported" | "unavailable";
type Notice = "checked" | "error" | "install-error" | "update-error" | null;
type PwaState = {
  status: Status; offline: boolean; installed: boolean; canInstall: boolean;
  updateReady: boolean; busy: boolean; notice: Notice;
  install(): Promise<void>; checkUpdates(): Promise<void>; requestUpdate(): void;
};
const PwaContext = createContext<PwaState | null>(null);
export const usePwa = () => useContext(PwaContext);

export function PwaProvider({ children, enabled = process.env.NODE_ENV === "production" }: { children: ReactNode; enabled?: boolean }) {
  const { preferences } = usePresentation();
  const tr = (es: string, en: string) => preferences.locale === "en" ? en : es;
  const [status, setStatus] = useState<Status>("checking");
  const [offline, setOffline] = useState(false), [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [changed, setChanged] = useState(false), [dismissed, setDismissed] = useState(false);
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const reloadRequested = useRef(false);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptRef = useRef<InstallPrompt | null>(null);

  useEffect(() => {
    let disposed = false;
    let previousController = navigator.serviceWorker?.controller;
    let lastCheck = 0;
    const cleanup: Array<() => void> = [];
    const standalone = window.matchMedia("(display-mode: standalone)");
    const connection = () => setOffline(!navigator.onLine);
    const displayMode = () => setInstalled(standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const installOffer = (event: Event) => { event.preventDefault(); promptRef.current = event as InstallPrompt; setPrompt(event as InstallPrompt); };
    const installDone = () => { setInstalled(true); setPrompt(null); promptRef.current = null; };
    const controllerChanged = () => {
      if (reloadRequested.current) { window.location.reload(); return; }
      if (previousController) { setChanged(true); setDismissed(false); }
      previousController = navigator.serviceWorker.controller;
      setWaiting(null);
      setStatus("ready");
    };
    const checkOnFocus = () => {
      if (navigator.onLine && document.visibilityState === "visible" && Date.now() - lastCheck > 60_000) {
        lastCheck = Date.now();
        void registration.current?.update().catch(() => { /* The next focus/manual check can retry. */ });
      }
    };
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    window.addEventListener("beforeinstallprompt", installOffer);
    window.addEventListener("appinstalled", installDone);
    window.addEventListener("focus", checkOnFocus);
    standalone.addEventListener("change", displayMode);

    void (async () => {
      // Defer browser-only state until after the identical server/client first render.
      await Promise.resolve();
      if (disposed) return;
      connection(); displayMode();
      if (!window.isSecureContext) { setStatus("insecure"); return; }
      if (!("serviceWorker" in navigator)) { setStatus("unsupported"); return; }
      if (!enabled) { setStatus("development"); return; }
      navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
      cleanup.push(() => navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged));
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        if (disposed) return;
        registration.current = reg;
        const inspect = () => {
          if (disposed) return;
          if (reg.waiting) { setWaiting(reg.waiting); setDismissed(false); }
          if (reg.active) setStatus("ready");
        };
        const observeInstalling = () => {
          const worker = reg.installing;
          if (!worker) return;
          const stateChanged = () => {
            inspect();
            if (worker.state === "redundant" && !reg.active) setStatus("unavailable");
          };
          worker.addEventListener("statechange", stateChanged);
          cleanup.push(() => worker.removeEventListener("statechange", stateChanged));
        };
        reg.addEventListener("updatefound", observeInstalling);
        cleanup.push(() => reg.removeEventListener("updatefound", observeInstalling));
        observeInstalling(); inspect();
      } catch { if (!disposed) setStatus("unavailable"); }
    })();
    return () => {
      disposed = true;
      registration.current = null;
      cleanup.forEach(fn => fn());
      if (updateTimer.current) clearTimeout(updateTimer.current);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      window.removeEventListener("beforeinstallprompt", installOffer);
      window.removeEventListener("appinstalled", installDone);
      window.removeEventListener("focus", checkOnFocus);
      standalone.removeEventListener("change", displayMode);
    };
  }, [enabled]);

  // Match the native browser toolbar to the user's saved theme, including system changes.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const color = preferences.theme === "dark" || (preferences.theme === "system" && media.matches) ? "#141615" : "#F4FAF8";
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => { meta.content = color; });
    };
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences.theme]);

  async function install() {
    const offer = promptRef.current;
    if (!offer) return;
    promptRef.current = null;
    setPrompt(null); setNotice(null);
    try {
      await offer.prompt();
      await offer.userChoice;
      // Only appinstalled / standalone confirms installation, not accepting the prompt.
    } catch { setNotice("install-error"); }
  }
  async function checkUpdates() {
    if (!registration.current || busy) return;
    setBusy(true); setNotice(null);
    try { await registration.current.update(); setNotice("checked"); }
    catch { setNotice("error"); }
    finally { setBusy(false); }
  }
  function applyUpdate() {
    setNotice(null);
    if (!waiting || waiting.state !== "installed") { window.location.reload(); return; }
    reloadRequested.current = true;
    setBusy(true);
    try { waiting.postMessage({ type: "ACTIVATE_UPDATE" }); }
    catch { reloadRequested.current = false; setBusy(false); setNotice("update-error"); return; }
    updateTimer.current = setTimeout(() => {
      reloadRequested.current = false; setBusy(false); setNotice("update-error");
    }, 10_000);
  }
  const updateReady = Boolean(waiting) || changed;
  return <PwaContext.Provider value={{ status, offline, installed, canInstall: Boolean(prompt), updateReady, busy, notice, install, checkUpdates, requestUpdate: () => setConfirm(true) }}>
    {offline && <div className="pwa-connectivity" role="status">{tr("Estás sin conexión. Necesitas internet para consultar o guardar cambios; no hay envíos pendientes automáticos.", "You're offline. Internet is required to load or save changes; there are no automatically queued changes.")}</div>}
    {children}
    {updateReady && !dismissed && <aside className="pwa-update" aria-label={tr("Actualización de la aplicación", "Application update")}>
      <div role="status"><strong>{tr("Una nueva versión está lista", "A new version is ready")}</strong><p>{tr("Guarda tus cambios antes de actualizar.", "Save your changes before updating.")}</p></div>
      <div className="pwa-actions"><button type="button" className="button button-secondary" onClick={() => setDismissed(true)}>{tr("Más tarde", "Later")}</button><button type="button" className="button button-primary" onClick={() => setConfirm(true)}>{tr("Actualizar", "Update")}</button></div>
    </aside>}
    {confirm && <Modal title={tr("¿Actualizar PagaTo?", "Update PagaTo?")} onClose={() => setConfirm(false)} busy={busy}>
      <p className="text-sm leading-6">{tr("Esta pestaña se recargará. Guarda primero cualquier formulario abierto: los cambios sin guardar se perderán. Tus datos ya guardados se conservan y las otras pestañas no se recargarán automáticamente.", "This tab will reload. Save any open forms first: unsaved changes will be lost. Saved data is preserved and other tabs will not reload automatically.")}</p>
      {notice === "update-error" && <p className="account-alert" role="alert">{tr("No se pudo activar la actualización. Inténtalo de nuevo.", "The update could not be activated. Try again.")}</p>}
      <div className="modal-actions"><button className="button button-secondary" type="button" data-modal-close disabled={busy}>{tr("Volver", "Go back")}</button><button className="button button-primary" type="button" onClick={applyUpdate} disabled={busy}>{busy ? tr("Actualizando…", "Updating…") : tr("Actualizar y recargar", "Update and reload")}</button></div>
    </Modal>}
  </PwaContext.Provider>;
}
