import "server-only";

import type { NeonQueryFunction } from "@neondatabase/serverless";
import { z } from "zod";
import type { FinancialProfileResult } from "../types";

type SqlClient = NeonQueryFunction<false, false>;
export type VerifiedIdentity = { userId: string; sessionId: string };

const profileRowSchema = z.object({
  id: z.uuid(),
  display_name: z.string(),
  email: z.string(),
  status: z.literal("active"),
  theme: z.enum(["light", "dark", "system"]),
  locale: z.enum(["es", "en"]),
  base_currency: z.string(),
  timezone: z.string(),
  date_format: z.string(),
  income_categories: z.number().int().nonnegative(),
  expense_categories: z.number().int().nonnegative(),
});

// Internal backend API. Identity must come from requireSession(), never from a form.
// No grants, roles, SECURITY DEFINER functions, or changes to managed auth tables.
export function buildProfileQueries(sql: SqlClient, identity: VerifiedIdentity) {
  const verifiedUser = sql`
    SELECT u.id::text AS auth_subject, u.email,
      COALESCE(NULLIF(left(btrim(u.name), 120), ''), 'Usuario') AS display_name
    FROM neon_auth.user u
    JOIN neon_auth.session s ON s."userId" = u.id
    WHERE u.id::text = ${identity.userId}
      AND s.id::text = ${identity.sessionId}
      AND s."expiresAt" > now()
      AND (u.banned IS NOT TRUE OR u."banExpires" <= now())
  `;
  const activeProfile = sql`
    SELECT p.id FROM pagato.app_users p
    JOIN (${verifiedUser}) u ON u.auth_subject = p.auth_subject
    WHERE p.status = 'active' AND p.deleted_at IS NULL
  `;

  return [
    sql`
      INSERT INTO pagato.app_users (auth_subject, email, display_name)
      ${verifiedUser}
      ON CONFLICT (auth_subject) DO NOTHING
    `,
    sql`
      INSERT INTO pagato.user_preferences (user_id)
      ${activeProfile}
      ON CONFLICT (user_id) DO NOTHING
    `,
    sql`SELECT pagato.seed_default_categories(p.id) FROM (${activeProfile}) p`,
    sql`
      SELECT p.id, p.display_name, p.email, p.status,
        prefs.theme, prefs.locale, prefs.base_currency, prefs.timezone, prefs.date_format,
        (SELECT count(*)::int FROM pagato.categories c
          WHERE c.user_id = p.id AND c.is_default AND c.category_type = 'income') AS income_categories,
        (SELECT count(*)::int FROM pagato.categories c
          WHERE c.user_id = p.id AND c.is_default AND c.category_type = 'expense') AS expense_categories
      FROM pagato.app_users p
      JOIN (${verifiedUser}) u ON u.auth_subject = p.auth_subject
      LEFT JOIN pagato.user_preferences prefs ON prefs.user_id = p.id
    `,
  ];
}

export async function ensureFinancialProfile(sql: SqlClient, identity: VerifiedIdentity): Promise<FinancialProfileResult> {
  // HTTP queries share one transaction, so a failed seed also rolls back the profile.
  // READ COMMITTED plus unique keys makes simultaneous first visits safe.
  const results = await sql.transaction(buildProfileQueries(sql, identity), {
    isolationLevel: "ReadCommitted",
    fetchOptions: { cache: "no-store", signal: AbortSignal.timeout(15_000) },
  });
  const row = results[3][0];
  if (!row) return { status: "invalid-session" };
  if (row.status !== "active") return { status: "inactive" };
  const profile = profileRowSchema.parse(row);

  return {
    status: "ready",
    profile: {
      id: profile.id,
      displayName: profile.display_name,
      email: profile.email,
      preferences: {
        theme: profile.theme,
        locale: profile.locale,
        baseCurrency: profile.base_currency,
        timezone: profile.timezone,
        dateFormat: profile.date_format,
      },
      defaultCategories: { income: profile.income_categories, expense: profile.expense_categories },
    },
  };
}
