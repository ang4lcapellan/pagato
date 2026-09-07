// Run only against the development database, with an existing signed-in test user.
// All verification mutations are rolled back, including preference/status changes.
import assert from "node:assert/strict";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { buildProfileQueries, ensureFinancialProfile } from "../../src/modules/users/server/profile-repository.ts";

config({ path: ".env.local", quiet: true });
const connection = process.env.DATABASE_URL;
if (!connection || !new URL(connection).hostname.startsWith("ep-withered-cake-axjxdd0s")) {
  throw new Error("Esta comprobación está limitada a la rama development de PagaTo.");
}
const sql = neon(connection);
const requestedUser = process.env.PAGATO_TEST_AUTH_SUBJECT;
const sessions = await sql`
  SELECT DISTINCT ON (s."userId") s."userId"::text AS user_id, s.id::text AS session_id
  FROM neon_auth.session s JOIN neon_auth.user u ON u.id = s."userId"
  WHERE s."expiresAt" > now() AND u.banned IS NOT TRUE
    AND (${requestedUser ?? null}::text IS NULL OR s."userId"::text = ${requestedUser ?? null})
  ORDER BY s."userId", s."createdAt" DESC LIMIT 2
`;
assert.equal(sessions.length, 1, "Inicia sesión con una cuenta de prueba. Si hay varias, define PAGATO_TEST_AUTH_SUBJECT con su ID de Auth.");
const identity = { userId: sessions[0].user_id, sessionId: sessions[0].session_id };
const rollback = sql.query("DO $$ BEGIN RAISE EXCEPTION 'PAGATO_TEST_ROLLBACK'; END $$");

async function rollbackCase(label, queries) {
  try {
    await sql.transaction([...queries, rollback], { isolationLevel: "ReadCommitted" });
    assert.fail("La transacción de prueba debió revertirse.");
  } catch (error) {
    if (error.message !== "PAGATO_TEST_ROLLBACK") {
      // Do not print DB errors: they may contain the user's email or query values.
      throw new Error(`Falló ${label}; código: ${error.code ?? "desconocido"}`);
    }
  }
  console.log(`OK: ${label} (rollback verificado)`);
}

await rollbackCase("perfil único, preferencias y diez categorías; reentrada sin duplicados", [
  ...buildProfileQueries(sql, identity),
  ...buildProfileQueries(sql, identity),
  sql`SELECT 1 / CASE WHEN
    (SELECT count(*) FROM pagato.app_users WHERE auth_subject = ${identity.userId}) = 1
    AND (SELECT count(*) FROM pagato.user_preferences prefs JOIN pagato.app_users p ON p.id = prefs.user_id WHERE p.auth_subject = ${identity.userId}) = 1
    AND (SELECT count(*) FROM pagato.categories c JOIN pagato.app_users p ON p.id = c.user_id WHERE p.auth_subject = ${identity.userId} AND c.is_default AND c.category_type = 'income') = 2
    AND (SELECT count(*) FROM pagato.categories c JOIN pagato.app_users p ON p.id = c.user_id WHERE p.auth_subject = ${identity.userId} AND c.is_default AND c.category_type = 'expense') = 8
    THEN 1 ELSE 0 END`,
]);

await rollbackCase("conserva preferencias y categorías desactivadas", [
  ...buildProfileQueries(sql, identity),
  sql`UPDATE pagato.user_preferences SET theme = 'dark', base_currency = 'USD', locale = 'en'
    WHERE user_id = (SELECT id FROM pagato.app_users WHERE auth_subject = ${identity.userId})`,
  sql`UPDATE pagato.categories SET is_active = false WHERE code = 'salary'
    AND user_id = (SELECT id FROM pagato.app_users WHERE auth_subject = ${identity.userId})`,
  ...buildProfileQueries(sql, identity),
  sql`SELECT 1 / CASE WHEN EXISTS (
    SELECT 1 FROM pagato.user_preferences prefs JOIN pagato.app_users p ON p.id = prefs.user_id
    WHERE p.auth_subject = ${identity.userId} AND prefs.theme = 'dark' AND prefs.base_currency = 'USD' AND prefs.locale = 'en'
  ) AND EXISTS (
    SELECT 1 FROM pagato.categories c JOIN pagato.app_users p ON p.id = c.user_id
    WHERE p.auth_subject = ${identity.userId} AND c.code = 'salary' AND NOT c.is_active
  ) THEN 1 ELSE 0 END`,
]);

for (const status of ["suspended", "deleted"]) {
  await rollbackCase(`no reactiva un perfil ${status}`, [
    ...buildProfileQueries(sql, identity),
    sql`UPDATE pagato.app_users SET status = ${status}, deleted_at = CASE WHEN ${status} = 'deleted' THEN now() ELSE NULL END
      WHERE auth_subject = ${identity.userId}`,
    ...buildProfileQueries(sql, identity),
    sql`SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM pagato.app_users WHERE auth_subject = ${identity.userId} AND status = ${status}) THEN 1 ELSE 0 END`,
  ]);
}

for (const invalidIdentity of [
  { ...identity, sessionId: "00000000-0000-0000-0000-000000000000" },
  { ...identity, userId: "00000000-0000-0000-0000-000000000000" },
  { ...identity, userId: "' OR 1=1 --" },
]) {
  assert.deepEqual(await ensureFinancialProfile(sql, invalidIdentity), { status: "invalid-session" });
}
console.log("OK: rechaza sesión inexistente, identidad ajena e inyección SQL; sin modificaciones.");
console.log("Comprobación de integración completada. No se conservaron cambios de prueba.");
