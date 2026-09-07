"use client";

import Image from "next/image";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import { usePwa } from "./pwa-provider";

export function PwaSettings() {
  const pwa = usePwa();
  const { preferences } = usePresentation();
  const tr = (es: string, en: string) => preferences.locale === "en" ? en : es;
  const status = pwa?.status ?? "development";
  return <section id="installation" className="preferences-card pwa-settings" aria-labelledby="pwa-title">
    <div className="pwa-heading"><Image src="/brand/pagato-mark.svg" alt="" width={52} height={52} /><div><span className="pwa-eyebrow">{tr("SIEMPRE A MANO", "ALWAYS WITH YOU")}</span><h2 id="pwa-title">{tr("PagaTo en tu dispositivo", "PagaTo on your device")}</h2></div></div>
    <p>{tr("La misma aplicación, tus mismas cuentas. Ábrela desde tu pantalla de inicio, en móvil o escritorio, sin descargar otra versión.", "The same app, the same accounts. Open it from your home screen on mobile or desktop, without a separate version.")}</p>
    {pwa?.installed ? <p className="pwa-state" role="status">{tr("PagaTo está instalada o abierta en modo aplicación.", "PagaTo is installed or running in app mode.")}</p> : <>
      {pwa?.canInstall && <button className="button button-primary" type="button" onClick={() => void pwa.install()}>{tr("Instalar PagaTo", "Install PagaTo")}</button>}
      <details className="pwa-help"><summary>{tr("Cómo instalar en mi dispositivo", "How to install on my device")}</summary><dl>
        <dt>Android</dt><dd>{tr("En Chrome, abre el menú ⋮ y elige «Instalar aplicación» o «Añadir a pantalla de inicio». También puedes usar el botón de instalación si aparece aquí.", "In Chrome, open the ⋮ menu and choose “Install app” or “Add to Home screen”. You can also use the install button when it appears here.")}</dd>
        <dt>iPhone / iPad</dt><dd>{tr("Abre PagaTo en Safari, toca Compartir y luego «Añadir a pantalla de inicio». Activa «Abrir como app web» si aparece y confirma Añadir.", "Open PagaTo in Safari, tap Share, then “Add to Home Screen”. Enable “Open as Web App” if shown and confirm Add.")}</dd>
        <dt>{tr("Escritorio", "Desktop")}</dt><dd>{tr("En Chrome o Edge, usa el icono de instalación de la barra de direcciones o la opción de instalar del menú. En Safari compatible para Mac: Archivo → Añadir al Dock.", "In Chrome or Edge, use the address bar install icon or the install option in the menu. In supported Safari for Mac: File → Add to Dock.")}</dd>
      </dl><p>{tr("Las opciones dependen del navegador. Si no permite instalar, puedes seguir usando la versión web.", "Options depend on your browser. If installation is not supported, you can still use the website.")}</p></details>
    </>}
    <div className="pwa-security"><strong>{tr("Sin conexión, sin copias privadas", "Offline, without private copies")}</strong><p>{tr("Para consultar y registrar tus finanzas necesitas internet. Solo se almacena una pantalla informativa sin conexión y sus recursos públicos: nunca saldos, movimientos, sesiones ni respuestas privadas en la caché PWA.", "Internet is required to view and manage your finances. Only an informational offline screen and its public assets are stored: balances, transactions, sessions and private responses are never stored in the PWA cache.")}</p></div>
    <div className="pwa-version"><p role="status">{
      status === "ready" ? tr("Pantalla sin conexión preparada en este navegador.", "Offline screen ready in this browser.") :
      status === "development" ? tr("Modo desarrollo: el service worker se activa en la versión de producción (npm run build y npm start).", "Development mode: the service worker is enabled in the production version (npm run build and npm start).") :
      status === "insecure" ? tr("Para instalar y habilitar la pantalla sin conexión, abre la aplicación por HTTPS o localhost. Una IP local por HTTP no es suficiente.", "To install and enable the offline screen, open the app over HTTPS or localhost. A local IP over HTTP is not sufficient.") :
      status === "unsupported" ? tr("Este navegador no admite la pantalla sin conexión. La versión web sigue disponible.", "This browser does not support the offline screen. The website remains available.") :
      status === "unavailable" ? tr("No se pudo preparar la pantalla sin conexión. Revisa tu conexión y recarga para reintentar.", "Could not prepare the offline screen. Check your connection and reload to retry.") :
      tr("Comprobando disponibilidad…", "Checking availability…")
    }</p>{status === "ready" && <button type="button" className="button button-secondary" disabled={pwa?.busy || pwa?.offline} onClick={() => pwa?.updateReady ? pwa.requestUpdate() : void pwa?.checkUpdates()}>{pwa?.busy ? tr("Comprobando…", "Checking…") : pwa?.updateReady ? tr("Actualizar aplicación", "Update application") : tr("Buscar actualizaciones", "Check for updates")}</button>}</div>
    {pwa?.notice && <p role="status" className="preferences-help">{pwa.notice === "checked" ? tr("Comprobación realizada. Si hay una versión nueva, te avisaremos cuando esté preparada.", "Check completed. If a new version is available, we will notify you when it is ready.") : tr("No se pudo completar la solicitud. Revisa tu conexión e inténtalo de nuevo.", "The request could not be completed. Check your connection and try again.")}</p>}
  </section>;
}
