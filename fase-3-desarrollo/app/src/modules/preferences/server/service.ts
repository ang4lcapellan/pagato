import "server-only";
import { cache } from "react";
import { getCurrentSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { DEFAULT_PREFERENCES, preferencesSchema } from "../model";
import { readPreferences } from "./repository";

// Request-scoped only. No shared user cache, cookies or localStorage as a source of truth.
export const getPresentation = cache(async () => {
  const session = await getCurrentSession();
  if (!session) return { owner: null, preferences: DEFAULT_PREFERENCES };
  try {
    const record = await readPreferences(getSqlClient(), { userId: session.user.id, sessionId: session.session.id });
    const parsed = preferencesSchema.safeParse(record?.preferences);
    if (parsed.success) return { owner: session.user.id, preferences: parsed.data };
  } catch { console.error("[preferences] No se pudo cargar la presentación."); }
  return { owner: session.user.id, preferences: DEFAULT_PREFERENCES };
});
