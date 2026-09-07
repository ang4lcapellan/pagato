import "server-only";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { VerifiedIdentity } from "@/modules/users/server/profile-repository";
import type { Preferences, PreferenceRecord } from "../model";
type Sql = NeonQueryFunction<false, false>;
function owner(sql: Sql, identity: VerifiedIdentity) {
  return sql`SELECT p.id FROM pagato.app_users p
    JOIN neon_auth.user u ON u.id::text = p.auth_subject JOIN neon_auth.session s ON s."userId" = u.id
    WHERE u.id::text = ${identity.userId} AND s.id::text = ${identity.sessionId} AND s."expiresAt" > now()
      AND (u.banned IS NOT TRUE OR u."banExpires" <= now()) AND p.status = 'active' AND p.deleted_at IS NULL`;
}
function projection(sql: Sql) {
  return sql`jsonb_build_object('theme', p.theme, 'locale', p.locale, 'baseCurrency', p.base_currency,
    'timezone', p.timezone, 'dateFormat', p.date_format, 'numberFormat', p.number_format) AS preferences,
    to_char(p.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS revision`;
}
export function preferencesQuery(sql: Sql, identity: VerifiedIdentity) {
  return sql`SELECT ${projection(sql)} FROM pagato.user_preferences p JOIN (${owner(sql, identity)}) o ON o.id = p.user_id`;
}
export function savePreferencesQuery(sql: Sql, identity: VerifiedIdentity, values: Preferences, revision: string) {
  return sql`UPDATE pagato.user_preferences p SET theme = ${values.theme}, locale = ${values.locale},
    base_currency = ${values.baseCurrency}, timezone = ${values.timezone}, date_format = ${values.dateFormat}, number_format = ${values.numberFormat}
    FROM (${owner(sql, identity)}) o WHERE p.user_id = o.id AND p.updated_at = ${revision}::timestamptz
      AND EXISTS(SELECT 1 FROM pg_timezone_names WHERE name = ${values.timezone})
    RETURNING ${projection(sql)}`;
}
export async function readPreferences(sql: Sql, identity: VerifiedIdentity): Promise<PreferenceRecord | null> {
  const rows = await preferencesQuery(sql, identity);
  return rows[0] ? rows[0] as PreferenceRecord : null;
}
