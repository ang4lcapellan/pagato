import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { createAccountQueries, updateAccountQuery, accountStatusQuery, listAccountsQuery } from "../../src/modules/accounts/server/repository.ts";

config({ path: ".env.local", quiet: true });
const connection = process.env.DATABASE_URL;
if (!connection || !new URL(connection).hostname.startsWith("ep-withered-cake-axjxdd0s")) throw new Error("Prueba limitada a development de PagaTo.");
const sql = neon(connection);
const requestedUser = process.env.PAGATO_TEST_AUTH_SUBJECT;
const sessions = await sql`SELECT DISTINCT ON (s."userId") s."userId"::text AS user_id, s.id::text AS session_id
  FROM neon_auth.session s JOIN pagato.app_users p ON p.auth_subject = s."userId"::text
  WHERE s."expiresAt" > now() AND p.status = 'active'
    AND (${requestedUser ?? null}::text IS NULL OR s."userId"::text = ${requestedUser ?? null})
  ORDER BY s."userId", s."createdAt" DESC LIMIT 2`;
assert.equal(sessions.length, 1, "Requiere un usuario de prueba activo; si hay varios, define PAGATO_TEST_AUTH_SUBJECT.");
const identity = { userId: sessions[0].user_id, sessionId: sessions[0].session_id };
const input = { id: randomUUID(), name: "QA rollback", accountType: "cash", currency: "DOP", openingBalance: "100.1234", creditLimit: null, institution: "", description: "Solo prueba transaccional", color: "#0B6B58" };
const fixedRevision = "2026-01-01T00:00:00.000000Z";

async function runCase(label, build, initialStatus = "active") {
  // Use an account created with a known timestamp, then restore the trigger-managed timestamp through normal writes.
  const setup = [
    sql`INSERT INTO pagato.accounts (id, user_id, name, account_type, currency_code, opening_balance, updated_at, status)
      SELECT ${input.id}::uuid, p.id, ${input.name}, 'cash', 'DOP', 100.1234, ${fixedRevision}::timestamptz, ${initialStatus}
      FROM pagato.app_users p WHERE p.auth_subject = ${identity.userId}`,
  ];
  const rollback = sql.query("DO $$ BEGIN RAISE EXCEPTION 'PAGATO_ACCOUNTS_ROLLBACK'; END $$");
  try {
    await sql.transaction([...setup, ...build(), rollback]);
    assert.fail("Faltó revertir la prueba.");
  } catch (error) {
    if (error.message !== "PAGATO_ACCOUNTS_ROLLBACK") throw new Error(`Falló ${label}; código ${error.code ?? "desconocido"}`);
  }
  console.log(`OK: ${label}; cambios revertidos.`);
}

await runCase("creación idempotente, lectura y precisión decimal", () => {
  const newAccount = { ...input, id: randomUUID() };
  return [...createAccountQueries(sql, identity, newAccount), ...createAccountQueries(sql, identity, newAccount),
    sql`SELECT 1 / CASE WHEN (SELECT count(*) FROM pagato.accounts WHERE id = ${newAccount.id}::uuid) = 1
      AND EXISTS(SELECT 1 FROM (${listAccountsQuery(sql, identity)}) result, jsonb_array_elements(result.accounts) a
        WHERE a->>'id' = ${newAccount.id} AND a->>'balance' = '100.1234') THEN 1 ELSE 0 END`];
});
await runCase("edición de cuenta propia", () => [
  updateAccountQuery(sql, identity, { ...input, name: "QA editada", openingBalance: "200.5678", currency: "USD" }, fixedRevision),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.accounts WHERE id = ${input.id}::uuid AND name = 'QA editada' AND opening_balance = 200.5678 AND currency_code = 'USD') THEN 1 ELSE 0 END`,
]);
await runCase("control de versión desactualizada", () => [
  updateAccountQuery(sql, identity, { ...input, name: "No debe guardarse" }, "2000-01-01T00:00:00Z"),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.accounts WHERE id = ${input.id}::uuid AND name = ${input.name}) THEN 1 ELSE 0 END`,
]);
await runCase("archivo sin eliminar historial", () => [
  accountStatusQuery(sql, identity, input.id, fixedRevision, "archived"),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.accounts WHERE id = ${input.id}::uuid AND status = 'archived') THEN 1 ELSE 0 END`,
]);
await runCase("reactivación", () => [
  accountStatusQuery(sql, identity, input.id, fixedRevision, "active"),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.accounts WHERE id = ${input.id}::uuid AND status = 'active') THEN 1 ELSE 0 END`,
], "archived");
await runCase("rechaza sesión inexistente en lectura y escritura", () => {
  const invalid = { ...identity, sessionId: "00000000-0000-0000-0000-000000000000" };
  return [updateAccountQuery(sql, invalid, { ...input, name: "No autorizado" }, fixedRevision), accountStatusQuery(sql, invalid, input.id, fixedRevision, "archived"),
    sql`SELECT 1 / CASE WHEN NOT EXISTS(${listAccountsQuery(sql, invalid)}) AND EXISTS(SELECT 1 FROM pagato.accounts WHERE id = ${input.id}::uuid AND name = ${input.name} AND status = 'active') THEN 1 ELSE 0 END`];
});
await runCase("aislamiento de otra cuenta financiera", () => {
  const otherUser = randomUUID(); const otherAccount = randomUUID();
  return [
    sql`INSERT INTO pagato.app_users (id, auth_subject, email, display_name) VALUES (${otherUser}::uuid, ${`qa-${otherUser}`}, ${`${otherUser}@example.invalid`}, 'QA temporal')`,
    sql`INSERT INTO pagato.accounts (id, user_id, name, account_type, currency_code, updated_at) VALUES (${otherAccount}::uuid, ${otherUser}::uuid, 'Cuenta ajena', 'cash', 'DOP', ${fixedRevision}::timestamptz)`,
    updateAccountQuery(sql, identity, { ...input, id: otherAccount, name: "No autorizado" }, fixedRevision),
    accountStatusQuery(sql, identity, otherAccount, fixedRevision, "archived"),
    ...createAccountQueries(sql, identity, { ...input, id: otherAccount }),
    sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.accounts WHERE id = ${otherAccount}::uuid AND user_id = ${otherUser}::uuid AND name = 'Cuenta ajena' AND status = 'active')
      AND NOT EXISTS(SELECT 1 FROM (${listAccountsQuery(sql, identity)}) result, jsonb_array_elements(result.accounts) a WHERE a->>'id' = ${otherAccount}) THEN 1 ELSE 0 END`,
  ];
});
await runCase("protege moneda y saldo inicial cuando hay movimientos", () => [
  sql`INSERT INTO pagato.transactions (user_id, transaction_type, source_account_id, source_amount, category_id, occurred_at)
    SELECT a.user_id, 'expense', a.id, 10, c.id, now() FROM pagato.accounts a JOIN pagato.categories c ON c.user_id = a.user_id AND c.code = 'food' AND c.is_active WHERE a.id = ${input.id}::uuid`,
  updateAccountQuery(sql, identity, { ...input, currency: "USD", openingBalance: "900" }, fixedRevision),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.accounts WHERE id = ${input.id}::uuid AND currency_code = 'DOP' AND opening_balance = 100.1234)
    AND EXISTS(SELECT 1 FROM (${listAccountsQuery(sql, identity)}) result, jsonb_array_elements(result.accounts) a WHERE a->>'id' = ${input.id} AND a->>'balance' = '90.1234' AND (a->>'hasTransactions')::boolean) THEN 1 ELSE 0 END`,
]);
console.log("Comprobaciones terminadas. No se guardaron cuentas, perfiles ni movimientos de prueba.");
