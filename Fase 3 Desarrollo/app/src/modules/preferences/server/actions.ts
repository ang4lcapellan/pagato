"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { DEFAULT_PREFERENCES, preferencesSchema, preferenceRevision, type PreferenceRecord, type PreferencesState } from "../model";
import { savePreferencesQuery } from "./repository";

export async function savePreferencesAction(_state: PreferencesState, form: FormData): Promise<PreferencesState> {
  const session = await requireSession();
  const raw = Object.fromEntries(form), revision = preferenceRevision.safeParse(raw.revision);
  if (!revision.success || !["save", "reset"].includes(String(raw.mode))) return { status: "error", message: "Actualiza la página antes de guardar tus preferencias." };
  const parsed = preferencesSchema.safeParse(raw.mode === "reset" ? DEFAULT_PREFERENCES : raw);
  if (!parsed.success) return { status: "error", message: "Revisa los campos marcados.", fields: parsed.error.flatten().fieldErrors };
  let record: PreferenceRecord;
  try {
    const rows = await savePreferencesQuery(getSqlClient(), { userId: session.user.id, sessionId: session.session.id }, parsed.data, revision.data);
    if (!rows[0]) return { status: "error", message: "Las preferencias cambiaron en otra pestaña o tu sesión ya no está activa. Recarga antes de reintentar." };
    record = rows[0] as PreferenceRecord;
  } catch {
    console.error("[preferences] No se pudo confirmar el guardado.");
    return { status: "error", message: "No pudimos confirmar el guardado. Comprueba la conexión y recarga para verificar tus preferencias." };
  }
  revalidatePath("/", "layout");
  return { status: "success", record, message: raw.mode === "reset" ? "Preferencias predeterminadas restauradas." : "Preferencias guardadas." };
}
