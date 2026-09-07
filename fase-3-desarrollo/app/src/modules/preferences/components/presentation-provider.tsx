"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { DEFAULT_PREFERENCES, formatPreferenceDate, formatPreferenceNumber, preferenceMoney, type Preferences } from "../model";
import { translate } from "../messages";

const PresentationContext = createContext<Preferences>(DEFAULT_PREFERENCES);
export function PresentationProvider({ preferences, children }: { preferences: Preferences; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = preferences.locale;
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences]);
  return <PresentationContext.Provider value={preferences}>{children}</PresentationContext.Provider>;
}
export function usePresentation() {
  const preferences = useContext(PresentationContext);
  return {
    preferences,
    t: (value: string | null | undefined) => translate(preferences.locale, value ?? ""),
    bucketLabel: (date: string, bucket: string) => {
      if (bucket === "month") return (preferences.locale === "en" ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] : ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"])[Number(date.slice(5, 7)) - 1];
      return preferences.dateFormat === "DD/MM/YYYY" ? `${date.slice(8, 10)}/${date.slice(5, 7)}` : preferences.dateFormat === "MM/DD/YYYY" ? `${date.slice(5, 7)}/${date.slice(8, 10)}` : date.slice(5, 10);
    },
    message: (parts: TemplateStringsArray, ...values: unknown[]) => {
      const key = parts.reduce((text, part, i) => text + (i ? `{${i - 1}}` : "") + part, "");
      return translate(preferences.locale, key).replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)]));
    },
    formatMoney: (value: string, currency: string) => preferenceMoney(value, currency, preferences.numberFormat),
    formatDate: (value: string) => formatPreferenceDate(value, preferences.dateFormat),
    formatNumber: (value: string | number) => formatPreferenceNumber(value, preferences.numberFormat),
  };
}
export function Text({ value }: { value: string }) { return usePresentation().t(value); }
