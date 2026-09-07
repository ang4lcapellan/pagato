import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { createTransactionQueries, updateTransactionQueries, deleteTransactionQuery, lockLedgerQuery, checkBalancesQuery } from "../../src/modules/transactions/server/repository.ts";
import { lockAccountQuery, updateAccountQuery } from "../../src/modules/accounts/server/repository.ts";
config({ path: ".env.local", quiet: true });
const connection = process.env.DATABASE_URL;
if (!connection || !new URL(connection).hostname.startsWith("ep-withered-cake-axjxdd0s")) throw new Error("Prueba limitada a development.");
const sql = neon(connection);
const sessions = await sql`SELECT DISTINCT ON (s."userId") s."userId"::text AS user_id, s.id::text AS session_id
  FROM neon_auth.session s JOIN pagato.app_users p ON p.auth_subject = s."userId"::text
  WHERE s."expiresAt" > now() AND p.status = 'active' AND p.deleted_at IS NULL
    AND (${process.env.PAGATO_TEST_AUTH_SUBJECT ?? null}::text IS NULL OR s."userId"::text = ${process.env.PAGATO_TEST_AUTH_SUBJECT ?? null})
  ORDER BY s."userId", s."createdAt" DESC LIMIT 2`;
assert.equal(sessions.length, 1, "Requiere una sesión activa de prueba.");
const identity = { userId: sessions[0].user_id, sessionId: sessions[0].session_id };

async function fixture(label, run) {
  const source = randomUUID(), destination = randomUUID(), category = randomUUID(), id = randomUUID();
  const name = `QA-CONCURRENCY-${randomUUID()}`;
  const txIds = [id, randomUUID()];
  const v = { id, type: "expense", sourceAccountId: source, destinationAccountId: null, categoryId: category,
    sourceCurrency: "DOP", destinationCurrency: "DOP", sourceAmount: "100", destinationAmount: null,
    occurredLocal: "2026-09-02T12:30", description: name, notes: "", paymentMethod: "" };
  try {
    await sql.transaction([
      sql`INSERT INTO pagato.accounts (id, user_id, name, account_type, currency_code, opening_balance, updated_at)
        SELECT f.id, p.id, ${name}, 'cash', 'DOP', f.amount, '2026-01-01T00:00:00Z'::timestamptz
        FROM pagato.app_users p CROSS JOIN (VALUES (${source}::uuid, 500), (${destination}::uuid, 0)) f(id, amount) WHERE p.auth_subject = ${identity.userId}`,
      sql`INSERT INTO pagato.categories (id, user_id, name, category_type) SELECT ${category}::uuid, p.id, ${name}, 'expense' FROM pagato.app_users p WHERE p.auth_subject = ${identity.userId}`,
    ]);
    await run({ v, source, destination, category, name, txIds });
    console.log(`OK: ${label}`);
  } finally {
    // Only this invocation's explicit UUIDs and fixture marker may be removed.
    await sql.transaction([
      sql`DELETE FROM pagato.transactions WHERE id = ANY(${txIds}::uuid[]) AND description = ${name}
        AND user_id IN (SELECT id FROM pagato.app_users WHERE auth_subject = ${identity.userId})`,
      sql`DELETE FROM pagato.categories WHERE id = ${category}::uuid AND name = ${name}
        AND user_id IN (SELECT id FROM pagato.app_users WHERE auth_subject = ${identity.userId})`,
      sql`DELETE FROM pagato.accounts WHERE id IN (${source}::uuid, ${destination}::uuid) AND name = ${name}
        AND user_id IN (SELECT id FROM pagato.app_users WHERE auth_subject = ${identity.userId})`,
    ]);
  }
}
const execute = queries => sql.transaction([...queries, checkBalancesQuery(sql, identity)], { isolationLevel: "ReadCommitted" });
const create = v => execute(createTransactionQueries(sql, identity, v));
const edit = (v, version) => execute(updateTransactionQueries(sql, identity, v, version));
const remove = (id, version) => execute([lockLedgerQuery(sql, identity), deleteTransactionQuery(sql, identity, id, version)]);
const account = async id => (await sql`SELECT a.currency_code, a.opening_balance::text, b.current_balance::text FROM pagato.accounts a JOIN pagato.account_balances b ON b.account_id = a.id WHERE a.id = ${id}::uuid`)[0];

try {
  await fixture("dos envíos simultáneos generan un solo gasto", async ({ v, source }) => {
    const result = await Promise.all([create(v), create(v)]);
    assert.equal(result.filter(r => r.at(-2).length === 1).length, 2);
    assert.equal((await account(source)).current_balance, "400.0000");
    assert.equal((await sql`SELECT id FROM pagato.transactions WHERE id = ${v.id}::uuid`).length, 1);
  });
  await fixture("ediciones simultáneas solo aceptan una versión", async ({ v, source }) => {
    await create(v);
    const result = await Promise.all([edit({ ...v, sourceAmount: "40" }, 1), edit({ ...v, sourceAmount: "60" }, 1)]);
    assert.equal(result.filter(r => r.at(-2).length === 1).length, 1);
    const [stored] = await sql`SELECT source_amount::text, version FROM pagato.transactions WHERE id = ${v.id}::uuid`;
    assert.equal(stored.version, 2);
    assert.equal((await account(source)).current_balance, stored.source_amount === "40.0000" ? "460.0000" : "440.0000");
    const deleted = await Promise.all([remove(v.id, 2), remove(v.id, 2)]);
    assert.equal(deleted.filter(r => r.at(-2).length === 1).length, 1);
    assert.equal((await account(source)).current_balance, "500.0000");
  });
  await fixture("cambiar moneda y registrar el primer gasto no reinterpreta importes", async ({ v, source, name }) => {
    const input = { id: source, name, accountType: "cash", currency: "USD", openingBalance: "500", creditLimit: null, institution: "", description: "", color: "#0B6B58" };
    const [changed, created] = await Promise.all([
      sql.transaction([lockAccountQuery(sql, identity, source), sql`SELECT pg_sleep(0.2)`, updateAccountQuery(sql, identity, input, "2026-01-01T00:00:00Z")], { isolationLevel: "ReadCommitted" }), create(v),
    ]);
    const stored = await account(source);
    if (changed.at(-1).length) {
      assert.equal(created.at(-2).length, 0);
      assert.equal(stored.currency_code, "USD");
      assert.equal(stored.current_balance, "500.0000");
    } else {
      assert.equal(created.at(-2).length, 1);
      assert.equal(stored.currency_code, "DOP");
      assert.equal(stored.current_balance, "400.0000");
    }
  });
  await fixture("transferencias simultáneas en sentidos opuestos conservan ambos saldos", async ({ v, source, destination, txIds }) => {
    const transfer = { ...v, type: "transfer", categoryId: null, destinationAccountId: destination, sourceAmount: "50", destinationAmount: "50" };
    await Promise.all([create(transfer), create({ ...transfer, id: txIds[1], sourceAccountId: destination, destinationAccountId: source })]);
    assert.equal((await account(source)).current_balance, "500.0000");
    assert.equal((await account(destination)).current_balance, "0.0000");
  });
  console.log("4 escenarios concurrentes completados; todas las cuentas, categorías y transacciones sintéticas fueron retiradas.");
} catch (error) {
  throw new Error(`Falló la comprobación concurrente; código ${error.code ?? "assertion"}. Se intentó retirar únicamente los fixtures de esta ejecución.`);
}
