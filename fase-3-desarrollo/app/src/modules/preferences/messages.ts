import { applicationEnglish } from "./english";
import { feedbackEnglish } from "./feedback-english";
export const english: Record<string, string> = {
  ...applicationEnglish,
  ...feedbackEnglish,
  "Tasa de ahorro: {0}%": "Savings rate: {0}%",
  "Efectivo": "Cash", "Cuenta bancaria": "Bank account", "Ahorros": "Savings", "Tarjeta de crédito": "Credit card", "Billetera digital": "Digital wallet", "Inversión": "Investment", "Otra cuenta": "Other account",
  "Peso dominicano": "Dominican peso", "Dólar estadounidense": "US dollar", "Euro": "Euro", "Dólar canadiense": "Canadian dollar", "Peso mexicano": "Mexican peso", "Peso colombiano": "Colombian peso",
  "Alimentación": "Food", "Transporte": "Transport", "Hogar": "Home", "Servicios": "Utilities", "Salud": "Health", "Educación": "Education", "Ocio": "Leisure", "Dinero": "Money", "Extra": "Extra", "Otros": "Others", "Otras categorías": "Other categories", "Trabajo": "Work", "Regalos": "Gifts", "Compras": "Shopping", "Mascotas": "Pets",
  "Verde profundo": "Deep green", "Verde menta": "Mint green", "Azul": "Blue", "Violeta": "Violet", "Amarillo": "Yellow", "Rojo": "Red", "Color actual": "Current color",
  "Límite superado": "Over limit", "Límite alcanzado": "Limit reached", "Cerca del límite": "Near the limit", "Dentro del límite": "Within limit",
  "Preferencias no disponibles": "Preferences unavailable", "No pudimos cargar tus preferencias. Recarga la página para reintentar.": "We could not load your preferences. Refresh the page to try again.",
  "Inicio": "Home", "Movimientos": "Transactions", "Cuentas": "Accounts", "Presupuestos": "Budgets", "Ajustes": "Settings",
  "Categorías": "Categories", "Cerrar sesión": "Sign out", "Cuenta personal": "Personal account", "Saltar al contenido": "Skip to content",
  "Navegación principal": "Main navigation", "Navegación móvil": "Mobile navigation", "Guardar cambios": "Save changes", "Guardando…": "Saving…",
  "Cancelar": "Cancel", "Cerrar": "Close", "Reintentar": "Try again", "Revisa los campos marcados.": "Check the highlighted fields.",
  "Preferencias guardadas.": "Preferences saved.", "Preferencias predeterminadas restauradas.": "Default preferences restored.",
  "Actualiza la página antes de guardar tus preferencias.": "Refresh the page before saving your preferences.",
  "Las preferencias cambiaron en otra pestaña o tu sesión ya no está activa. Recarga antes de reintentar.": "Preferences changed in another tab or your session is no longer active. Refresh before trying again.",
  "No pudimos confirmar el guardado. Comprueba la conexión y recarga para verificar tus preferencias.": "We could not confirm the save. Check your connection and refresh to verify your preferences.",
  "Selecciona una zona horaria válida.": "Select a valid time zone.",
};
export function translate(locale: "es" | "en", value: string): string {
  if (locale === "es") return value;
  const key = value.trim();
  const maximum = /^Máximo (\d+) (caracteres|categorías)\.$/.exec(key);
  if (maximum) return `Maximum ${maximum[1]} ${maximum[2] === "caracteres" ? "characters" : "categories"}.`;
  return english[key] ? value.replace(key, english[key]) : value;
}
