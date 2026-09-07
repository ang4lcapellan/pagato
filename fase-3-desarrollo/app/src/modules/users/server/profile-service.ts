import "server-only";

import { cache } from "react";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import type { FinancialProfileResult } from "../types";
import { ensureFinancialProfile } from "./profile-repository";

// Request-scoped only: never cache a user's financial profile across requests.
export const getFinancialProfile = cache(async (): Promise<FinancialProfileResult> => {
  const session = await requireSession();
  try {
    return await ensureFinancialProfile(getSqlClient(), {
      userId: session.user.id,
      sessionId: session.session.id,
    });
  } catch {
    // Database errors can contain connection details, email addresses and SQL values.
    console.error("[financial-profile] No se pudo preparar el perfil financiero.");
    return { status: "unavailable" };
  }
});
