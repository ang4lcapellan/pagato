"use client";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { CURRENCIES } from "@/modules/accounts/model";
import { signOutAction } from "@/modules/auth/actions";
import { DATE_FORMATS, formatPreferenceDate, preferenceMoney, initialPreferencesState, type PreferenceRecord, type Preferences } from "../model";
import { savePreferencesAction } from "../server/actions";
import { usePresentation } from "./presentation-provider";
import { PwaSettings } from "@/modules/pwa/components/pwa-settings";

export function PreferencesScreen({ record, name, email, timezones }: { record: PreferenceRecord; name: string; email: string; timezones: string[] }) {
  const { preferences, t } = usePresentation();
  const tr = (es: string, en: string) => preferences.locale === "en" ? en : es;
  const router = useRouter();
  const [reset, setReset] = useState(false), [notice, setNotice] = useState("");
  const onReset = useCallback((message: string) => { setReset(false); setNotice(message); router.refresh(); }, [router]);
  return <>
    <header className="accounts-heading"><div><h1>{tr("Configuración", "Settings")}</h1><p>{tr("Personaliza PagaTo según tus preferencias.", "Make PagaTo work the way you do.")}</p></div></header>
    <div className="preferences-layout">
      <aside className="preferences-sidebar"><div className="preferences-profile"><span className="user-avatar">{name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join("").toUpperCase()}</span><div><strong>{name}</strong><span>{email}</span></div></div>
        <nav aria-label={tr("Secciones de configuración", "Settings sections")}><a href="#appearance">{tr("Apariencia", "Appearance")}</a><a href="#regional">{tr("Moneda e idioma", "Currency and language")}</a><a href="#formats">{tr("Fechas y números", "Dates and numbers")}</a><a href="#installation">{tr("Instalar aplicación", "Install application")}</a></nav>
        <div className="preferences-links"><h2>{tr("Organización financiera", "Financial organization")}</h2><Link href="/categories"><Icon name="categories" />{tr("Categorías", "Categories")}<Icon name="arrow" /></Link><Link href="/budgets"><Icon name="budget" />{tr("Presupuestos", "Budgets")}<Icon name="arrow" /></Link></div>
        <form action={signOutAction}><button className="button button-secondary w-full">{tr("Cerrar sesión", "Sign out")}</button></form>
      </aside>
      <div className="preferences-content">
        {notice && <p role="status" className="account-success">{t(notice)}</p>}
        <PreferencesForm key={record.revision} record={record} timezones={timezones} onSaved={setNotice} />
        <PwaSettings />
        <section className="preferences-reset"><div><h2>{tr("Volver a empezar", "Start fresh")}</h2><p>{tr("Restaura únicamente tus preferencias. Tus cuentas, categorías, movimientos y presupuestos se conservan.", "Reset only your preferences. Your accounts, categories, transactions and budgets stay unchanged.")}</p></div><button type="button" className="button button-secondary" onClick={() => { setNotice(""); setReset(true); }}>{tr("Restaurar predeterminadas", "Restore defaults")}</button></section>
      </div>
    </div>
    {reset && <ResetPreferences revision={record.revision} onClose={() => setReset(false)} onSaved={onReset} />}
  </>;
}

export function PreferencesForm({ record, timezones, onSaved }: { record: PreferenceRecord; timezones: string[]; onSaved?: (message: string) => void }) {
  const { preferences, t } = usePresentation();
  const tr = (es: string, en: string) => preferences.locale === "en" ? en : es;
  const [values, setValues] = useState<Preferences>(record.preferences);
  const [state, action, pending] = useActionState(async (previous: typeof initialPreferencesState, data: FormData) => {
    const result = await savePreferencesAction(previous, data);
    if (result.status === "success") onSaved?.(result.message!);
    return result;
  }, initialPreferencesState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.status === "error") (form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>('[role="alert"]'))?.focus(); }, [state]);
  const change = (key: keyof Preferences, value: string) => setValues(v => ({ ...v, [key]: value }));
  const attrs = (key: string) => ({ "aria-invalid": Boolean(state.fields?.[key]), "aria-describedby": state.fields?.[key] ? `pref-${key}-error` : undefined });
  const error = (key: string) => state.fields?.[key] && <p className="field-error" id={`pref-${key}-error`}>{tr("Revisa esta opción.", "Check this option.")}</p>;
  const dirty = JSON.stringify(values) !== JSON.stringify(record.preferences);
  const zones = [...new Set([...timezones, record.preferences.timezone, "UTC"])].sort();
  return <form ref={form} action={action} className="preferences-form">
    <input type="hidden" name="mode" value="save" /><input type="hidden" name="revision" value={state.record?.revision ?? record.revision} />
    {state.status === "error" && <p className="account-alert" role="alert" tabIndex={-1}>{t(state.message ?? "Revisa los campos marcados.")}</p>}
    {state.status === "success" && !onSaved && <p className="account-success" role="status">{t(state.message!)}</p>}
    <fieldset disabled={pending} className="preferences-sections">
      <section className="preferences-card" id="appearance"><h2>{tr("Apariencia", "Appearance")}</h2><p>{tr("Elige cómo quieres ver tu aplicación.", "Choose how your application looks.")}</p>
        <fieldset className="preferences-themes"><legend className="sr-only">{tr("Tema de la aplicación", "Application theme")}</legend>{(["light", "dark", "system"] as const).map((theme, i) => <label className="preferences-theme" key={theme}><input type="radio" name="theme" value={theme} checked={values.theme === theme} onChange={() => change("theme", theme)} /><span className={`preferences-theme-preview preferences-theme-${theme}`} aria-hidden="true"><i /><b /><em /></span><strong>{tr(["Claro", "Oscuro", "Sistema"][i], ["Light", "Dark", "System"][i])}</strong></label>)}</fieldset>{error("theme")}
        <p className="preferences-help">{tr("Sistema sigue automáticamente el modo claro u oscuro de tu dispositivo, incluso cuando cambia.", "System automatically follows your device’s light or dark mode, including changes.")}</p>
      </section>
      <section className="preferences-card" id="regional"><h2>{tr("Moneda e idioma", "Currency and language")}</h2><p>{tr("Opciones predeterminadas para tu cuenta personal.", "Defaults for your personal account.")}</p><div className="preferences-fields">
        <div className="account-field"><label htmlFor="pref-locale">{tr("Idioma", "Language")}</label><select className="auth-input" id="pref-locale" name="locale" value={values.locale} onChange={e => change("locale", e.target.value)} {...attrs("locale")}><option value="es">Español</option><option value="en">English</option></select>{error("locale")}</div>
        <div className="account-field"><label htmlFor="pref-currency">{tr("Moneda principal", "Primary currency")}</label><select className="auth-input" id="pref-currency" name="baseCurrency" value={values.baseCurrency} onChange={e => change("baseCurrency", e.target.value)} {...attrs("baseCurrency")}>{Object.entries(CURRENCIES).map(([code, label]) => <option key={code} value={code}>{code} · {t(label)}</option>)}</select>{error("baseCurrency")}</div>
      </div><p className="account-note mt-5">{tr("La moneda principal se usa para la presentación y los nuevos formularios. No convierte saldos ni modifica la moneda o los importes originales de tus transacciones.", "The primary currency is used for presentation and new forms. It does not convert balances or change the original currency or amounts of your transactions.")}</p></section>
      <section className="preferences-card" id="formats"><h2>{tr("Fechas y números", "Dates and numbers")}</h2><p>{tr("Visualiza tus datos con el formato que te resulte más claro.", "View your data in the format that works best for you.")}</p><div className="preferences-fields">
        <div className="account-field preferences-full"><label htmlFor="pref-timezone">{tr("Zona horaria", "Time zone")}</label><select className="auth-input" id="pref-timezone" name="timezone" value={values.timezone} onChange={e => change("timezone", e.target.value)} {...attrs("timezone")}>{zones.map(zone => <option value={zone} key={zone}>{zone.replaceAll("_", " ")}</option>)}</select>{error("timezone")}<p className="field-help">{tr("Afecta la hora visible y los límites de los días en filtros y presupuestos. Los instantes guardados no cambian.", "Affects displayed times and day boundaries in filters and budgets. Stored timestamps do not change.")}</p></div>
        <div className="account-field"><label htmlFor="pref-date">{tr("Formato de fecha", "Date format")}</label><select className="auth-input" id="pref-date" name="dateFormat" value={values.dateFormat} onChange={e => change("dateFormat", e.target.value)} {...attrs("dateFormat")}>{DATE_FORMATS.map(format => <option key={format} value={format}>{format} · {formatPreferenceDate("2026-09-23", format)}</option>)}</select>{error("dateFormat")}</div>
        <div className="account-field"><label htmlFor="pref-number">{tr("Formato numérico", "Number format")}</label><select className="auth-input" id="pref-number" name="numberFormat" value={values.numberFormat} onChange={e => change("numberFormat", e.target.value)} {...attrs("numberFormat")}><option value="comma-dot">1,234.56</option><option value="dot-comma">1.234,56</option></select>{error("numberFormat")}</div>
      </div><div className="preferences-example"><span>{tr("Vista previa de formato", "Format preview")}</span><strong>{preferenceMoney("12345.67", values.baseCurrency, values.numberFormat)}</strong><span>{formatPreferenceDate("2026-09-23", values.dateFormat)}</span></div><p className="preferences-help">{tr("Los campos de entrada conservan el formato de fecha del navegador. Escribe los montos sin separadores de miles.", "Date inputs keep your browser’s format. Enter amounts without thousands separators.")}</p></section>
      <div className="preferences-save"><p>{tr("Los cambios se aplican al guardar y se conservan para tu usuario en otros dispositivos.", "Changes apply when saved and follow your account across devices.")}</p><button type="button" className="button button-secondary" disabled={!dirty || pending} onClick={() => setValues(record.preferences)}>{tr("Descartar", "Discard")}</button><button className="button button-primary" disabled={!dirty || pending}>{pending ? tr("Guardando…", "Saving…") : tr("Guardar cambios", "Save changes")}</button></div>
    </fieldset>
  </form>;
}

function ResetPreferences({ revision, onClose, onSaved }: { revision: string; onClose: () => void; onSaved: (message: string) => void }) {
  const { preferences, t } = usePresentation();
  const tr = (es: string, en: string) => preferences.locale === "en" ? en : es;
  const [state, action, pending] = useActionState(savePreferencesAction, initialPreferencesState);
  useEffect(() => { if (state.status === "success") onSaved(state.message!); }, [state, onSaved]);
  return <Modal title={tr("¿Restaurar preferencias?", "Restore preferences?")} onClose={onClose} busy={pending}><p className="text-sm leading-6">{tr("Se aplicarán: tema del sistema, español, DOP, America/Santo Domingo, DD/MM/YYYY y 1,234.56. Tus datos financieros no cambian.", "Defaults: system theme, Spanish, DOP, America/Santo Domingo, DD/MM/YYYY and 1,234.56. Your financial data stays unchanged.")}</p><form action={action}><input type="hidden" name="mode" value="reset" /><input type="hidden" name="revision" value={revision} />{state.status === "error" && <p role="alert" className="account-alert mt-5">{t(state.message!)}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" data-modal-close disabled={pending}>{tr("Cancelar", "Cancel")}</button><button className="button button-primary" disabled={pending}>{pending ? tr("Restaurando…", "Restoring…") : tr("Restaurar preferencias", "Restore preferences")}</button></div></form></Modal>;
}
