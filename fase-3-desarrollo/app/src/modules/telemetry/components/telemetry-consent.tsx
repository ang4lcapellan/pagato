"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useState } from "react";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";

const CONSENT_KEY = "pagato.telemetry-consent.v1";
const CONSENT_EVENT = "pagato:telemetry-consent";
type Consent = "accepted" | "declined";

function readConsent(): Consent | null {
  const value = window.localStorage.getItem(CONSENT_KEY);
  return value === "accepted" || value === "declined" ? value : null;
}

function saveConsent(value: Consent) {
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
}

function normalizedRoute(pathname: string) {
  if (/^\/budgets\/[0-9a-f-]{36}$/i.test(pathname)) return "/budgets/[id]";
  const allowed = new Set(["/", "/privacy", "/terms", "/auth/sign-in", "/auth/sign-up", "/auth/forgot-password", "/auth/reset-password", "/accounts", "/budgets", "/categories", "/dashboard", "/settings", "/transactions"]);
  return allowed.has(pathname) ? pathname : "/other";
}

function sendMetric(name: string, value: number, rating: string, pathname: string) {
  if (window.localStorage.getItem(CONSENT_KEY) !== "accepted") return;
  const body = JSON.stringify({ name, value, rating, route: normalizedRoute(pathname) });
  navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }));
}

const reportWebVital: Parameters<typeof useReportWebVitals>[0] = metric => {
  sendMetric(metric.name, metric.value, metric.rating, window.location.pathname);
};

export function TelemetryConsent() {
  const pathname = usePathname();
  const { preferences } = usePresentation();
  const tr = (es: string, en: string) => preferences.locale === "en" ? en : es;
  const [consent, setConsent] = useState<Consent | null>(null);
  useReportWebVitals(reportWebVital);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setConsent(readConsent()));
    const changed = (event: Event) => setConsent((event as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, changed);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener(CONSENT_EVENT, changed); };
  }, []);

  useEffect(() => {
    if (consent === "accepted") sendMetric("PAGE_VIEW", 1, "none", pathname);
  }, [consent, pathname]);

  function choose(value: Consent) {
    saveConsent(value);
    setConsent(value);
  }

  if (consent !== null) return null;
  return <aside className="consent-banner" role="dialog" aria-modal="false" aria-labelledby="consent-title">
    <div><strong id="consent-title">{tr("Privacidad y medición opcional", "Privacy and optional measurement")}</strong><p>{tr("Usamos cookies esenciales para tu sesión. Solo con tu permiso medimos rendimiento y visitas sin enviar correos, importes ni datos financieros.", "We use essential cookies for your session. Only with your permission do we measure performance and visits without sending emails, amounts, or financial data.")} <Link href="/privacy">{tr("Leer política", "Read policy")}</Link>.</p></div>
    <div className="consent-actions"><button className="button button-secondary" type="button" onClick={() => choose("declined")}>{tr("Solo necesarias", "Essential only")}</button><button className="button button-primary" type="button" onClick={() => choose("accepted")}>{tr("Permitir medición", "Allow measurement")}</button></div>
  </aside>;
}

export function TelemetryPreference() {
  const [consent, setConsent] = useState<Consent | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setConsent(readConsent()));
    const changed = (event: Event) => setConsent((event as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, changed);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener(CONSENT_EVENT, changed); };
  }, []);
  const choose = (value: Consent) => { saveConsent(value); setConsent(value); };
  return <div className="telemetry-preference"><p>Estado actual: <strong>{consent === "accepted" ? "medición permitida" : consent === "declined" ? "solo funciones necesarias" : "sin decidir"}</strong>.</p><div><button type="button" className="button button-secondary" onClick={() => choose("declined")}>Usar solo lo necesario</button><button type="button" className="button button-primary" onClick={() => choose("accepted")}>Permitir medición</button></div></div>;
}
