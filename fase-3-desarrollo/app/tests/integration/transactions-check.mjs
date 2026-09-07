import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { createTransactionQueries, updateTransactionQueries, deleteTransactionQuery, historyQuery, checkBalancesQuery } from "../../src/modules/transactions/server/repository.ts";
import { lockAccountQuery, updateAccountQuery } from "../../src/modules/accounts/server/repository.ts";

config({ path: ".env.local", quiet: true });
const connection = process.env.DATABASE_URL;
if (!connection || !new URL(connection).hostname.startsWith("ep-withered-cake-axjxdd0s")) throw new Error("Prueba limitada a development de PagaTo.");
const sql = neon(connection);
const sessions = await sql`SELECT DISTINCT ON (s."userId") s."userId"::text AS user_id, s.id::text AS session_id
  FROM neon_auth.session s JOIN pagato.app_users p ON p.auth_subject = s."userId"::text
  WHERE s."expiresAt" > now() AND p.status = 'active' AND p.deleted_at IS NULL
    AND (${process.env.PAGATO_TEST_AUTH_SUBJECT ?? null}::text IS NULL OR s."userId"::text = ${process.env.PAGATO_TEST_AUTH_SUBJECT ?? null})
  ORDER BY s."userId", s."createdAt" DESC LIMIT 2`;
assert.equal(sessions.length, 1, "Requiere una sesión activa; si hay varias, define PAGATO_TEST_AUTH_SUBJECT.");
const identity = { userId: sessions[0].user_id, sessionId: sessions[0].session_id };
const ids = Object.fromEntries(["source", "destination", "foreign", "expense", "income", "otherUser", "otherAccount", "otherCategory", "otherTransaction"].map(key => [key, randomUUID()]));
const prefix = `QA-TX-${randomUUID()}`;
const filters = { q: prefix, type: "all", from: "", to: "", account: "", category: "", page: 1 };
const input = (type = "expense", changes = {}) => ({ id: randomUUID(), type,
  sourceCurrency: "DOP", destinationCurrency: "DOP",
  sourceAccountId: type === "income" ? null : ids.source,
  destinationAccountId: type === "expense" ? null : ids.destination,
  categoryId: type === "transfer" ? null : ids[type],
  sourceAmount: type === "income" ? null : "100.0001", destinationAmount: type === "expense" ? null : "100.0001",
  occurredLocal: "2026-09-02T12:30", description: `${prefix} café 100%_`, notes: "Nota de prueba", paymentMethod: "QA", ...changes });
function setup() {
  return [
    sql`INSERT INTO pagato.accounts (id, user_id, name, account_type, currency_code, opening_balance, updated_at)
      SELECT fixtures.id, p.id, ${prefix}, 'cash', currency, amount, '2026-01-01T00:00:00Z'::timestamptz
      FROM pagato.app_users p CROSS JOIN (VALUES (${ids.source}::uuid, 'DOP', 500), (${ids.destination}::uuid, 'DOP', 0), (${ids.foreign}::uuid, 'USD', 20)) fixtures(id, currency, amount)
      WHERE p.auth_subject = ${identity.userId}`,
    sql`INSERT INTO pagato.categories (id, user_id, name, category_type)
      SELECT fixtures.id, p.id, ${prefix}, type FROM pagato.app_users p CROSS JOIN (VALUES (${ids.expense}::uuid, 'expense'), (${ids.income}::uuid, 'income')) fixtures(id, type)
      WHERE p.auth_subject = ${identity.userId}`,
  ];
}
async function runCase(label, build) {
  try {
    await sql.transaction([...setup(), ...build(), sql.query("DO $$ BEGIN RAISE EXCEPTION 'PAGATO_TRANSACTIONS_ROLLBACK'; END $$")]);
    assert.fail("La prueba debe revertirse.");
  } catch (error) {
    if (error.message !== "PAGATO_TRANSACTIONS_ROLLBACK") throw new Error(`Falló ${label}; código ${error.code ?? "desconocido"}`);
  }
  console.log(`OK: ${label}; cambios revertidos.`);
}
const check = condition => sql`SELECT 1 / CASE WHEN (${condition}) THEN 1 ELSE 0 END`;
const balance = (id, value) => check(sql`(SELECT current_balance FROM pagato.account_balances WHERE account_id = ${id}::uuid) = ${value}::numeric`);
const exists = (id, expected = true) => check(sql`EXISTS(SELECT 1 FROM pagato.transactions WHERE id = ${id}::uuid) = ${expected}`);

await runCase("gasto e ingreso exactos actualizan sus cuentas", () => [
  ...createTransactionQueries(sql, identity, input()), balance(ids.source, "399.9999"),
  ...createTransactionQueries(sql, identity, input("income")), balance(ids.destination, "100.0001"),
]);
await runCase("transferencia atómica y neutral en la misma moneda", () => {
  const v = input("transfer");
  return [...createTransactionQueries(sql, identity, v), balance(ids.source, "399.9999"), balance(ids.destination, "100.0001"),
    check(sql`(SELECT count(*) FROM pagato.transactions WHERE id = ${v.id}::uuid) = 1`),
    check(sql`(SELECT jsonb_array_length(totals) FROM (${historyQuery(sql, identity, filters)}) h) = 0`)];
});
await runCase("transferencia entre monedas usa importe recibido explícito", () => [
  ...createTransactionQueries(sql, identity, input("transfer", { destinationAccountId: ids.foreign, destinationCurrency: "USD", sourceAmount: "60", destinationAmount: "1" })),
  balance(ids.source, "440"), balance(ids.foreign, "21"),
]);
await runCase("rechazar transferencia desigual en misma moneda y misma cuenta", () => {
  const unequal = input("transfer", { destinationAmount: "2" });
  const same = input("transfer", { destinationAccountId: ids.source });
  return [...createTransactionQueries(sql, identity, unequal), ...createTransactionQueries(sql, identity, same), exists(unequal.id, false), exists(same.id, false), balance(ids.source, "500")];
});
await runCase("repetir solicitud no duplica, reutilizar clave con otro monto no modifica", () => {
  const v = input();
  const changed = { ...v, sourceAmount: "200" };
  const queries = createTransactionQueries(sql, identity, changed);
  return [...createTransactionQueries(sql, identity, v), ...createTransactionQueries(sql, identity, v), ...queries,
    check(sql`NOT EXISTS(${queries.at(-1)})`), balance(ids.source, "399.9999"),
    check(sql`(SELECT count(*) FROM pagato.transactions WHERE client_request_id = ${v.id}::uuid) = 1`)];
});
await runCase("editar gasto, convertir a ingreso y rechazar versión obsoleta", () => {
  const v = input();
  return [...createTransactionQueries(sql, identity, v), ...updateTransactionQueries(sql, identity, { ...v, sourceAmount: "120" }, 1), balance(ids.source, "380"),
    ...updateTransactionQueries(sql, identity, { ...v, sourceAmount: "300" }, 1), balance(ids.source, "380"),
    ...updateTransactionQueries(sql, identity, input("income", { id: v.id, destinationAmount: "30" }), 2), balance(ids.source, "500"), balance(ids.destination, "30"),
    check(sql`EXISTS(SELECT 1 FROM pagato.transactions WHERE id = ${v.id}::uuid AND version = 3 AND transaction_type = 'income')`)];
});
await runCase("editar transferencia recalcula ambos lados", () => {
  const v = input("transfer");
  return [...createTransactionQueries(sql, identity, v), ...updateTransactionQueries(sql, identity, { ...v, sourceAmount: "50", destinationAmount: "50" }, 1), balance(ids.source, "450"), balance(ids.destination, "50")];
});
await runCase("eliminación lógica revierte transferencia y no permite resucitar por reenvío", () => {
  const v = input("transfer");
  return [...createTransactionQueries(sql, identity, v), deleteTransactionQuery(sql, identity, v.id, 1), deleteTransactionQuery(sql, identity, v.id, 1),
    ...createTransactionQueries(sql, identity, v), ...updateTransactionQueries(sql, identity, v, 2),
    balance(ids.source, "500"), balance(ids.destination, "0"),
    check(sql`EXISTS(SELECT 1 FROM pagato.transactions WHERE id = ${v.id}::uuid AND deleted_at IS NOT NULL AND version = 2)`),
    check(sql`(SELECT count FROM (${historyQuery(sql, identity, filters)}) h) = 0`)];
});
await runCase("cuentas archivadas y categorías inactivas no reciben nuevas escrituras", () => {
  const v = input(); const archived = input("income");
  return [...createTransactionQueries(sql, identity, v), sql`UPDATE pagato.categories SET is_active = false WHERE id = ${ids.expense}::uuid`,
    ...updateTransactionQueries(sql, identity, { ...v, sourceAmount: "200" }, 1), balance(ids.source, "399.9999"),
    sql`UPDATE pagato.accounts SET status = 'archived' WHERE id = ${ids.destination}::uuid`,
    ...createTransactionQueries(sql, identity, archived), exists(archived.id, false),
    deleteTransactionQuery(sql, identity, v.id, 1), balance(ids.source, "500")];
});
await runCase("no admite categoría de otro tipo", () => {
  const v = input("income", { categoryId: ids.expense });
  return [...createTransactionQueries(sql, identity, v), exists(v.id, false)];
});
await runCase("sesión inválida no puede leer, crear, editar ni eliminar", () => {
  const invalid = { ...identity, sessionId: randomUUID() }; const v = input(); const fresh = input();
  return [...createTransactionQueries(sql, identity, v), ...createTransactionQueries(sql, invalid, fresh), exists(fresh.id, false),
    ...updateTransactionQueries(sql, invalid, { ...v, sourceAmount: "1" }, 1), deleteTransactionQuery(sql, invalid, v.id, 1), balance(ids.source, "399.9999"),
    check(sql`NOT EXISTS(${historyQuery(sql, invalid, filters)})`)];
});
await runCase("aislamiento del historial, las cuentas y las categorías de otro usuario", () => {
  const accountForeign = input("expense", { sourceAccountId: ids.otherAccount });
  const categoryForeign = input("expense", { categoryId: ids.otherCategory });
  return [
    sql`INSERT INTO pagato.app_users (id, auth_subject, email, display_name) VALUES (${ids.otherUser}::uuid, ${prefix}, ${`${ids.otherUser}@example.invalid`}, 'QA temporal')`,
    sql`INSERT INTO pagato.accounts (id, user_id, name, account_type, currency_code) VALUES (${ids.otherAccount}::uuid, ${ids.otherUser}::uuid, 'QA ajena', 'cash', 'DOP')`,
    sql`INSERT INTO pagato.categories (id, user_id, name, category_type) VALUES (${ids.otherCategory}::uuid, ${ids.otherUser}::uuid, 'QA ajena', 'expense')`,
    sql`INSERT INTO pagato.transactions (id, user_id, transaction_type, source_account_id, source_amount, category_id, occurred_at, description)
      VALUES (${ids.otherTransaction}::uuid, ${ids.otherUser}::uuid, 'expense', ${ids.otherAccount}::uuid, 5, ${ids.otherCategory}::uuid, now(), ${prefix})`,
    ...createTransactionQueries(sql, identity, accountForeign), exists(accountForeign.id, false),
    ...createTransactionQueries(sql, identity, categoryForeign), exists(categoryForeign.id, false),
    ...updateTransactionQueries(sql, identity, input("expense", { id: ids.otherTransaction }), 1), deleteTransactionQuery(sql, identity, ids.otherTransaction, 1),
    check(sql`EXISTS(SELECT 1 FROM pagato.transactions WHERE id = ${ids.otherTransaction}::uuid AND version = 1 AND source_amount = 5 AND deleted_at IS NULL)`),
    check(sql`(SELECT count FROM (${historyQuery(sql, identity, filters)}) h) = 0`),
  ];
});
await runCase("filtros combinados, búsqueda literal y totales separados por moneda", () => {
  return [...createTransactionQueries(sql, identity, input()), ...createTransactionQueries(sql, identity, input("income", { destinationAmount: "200" })),
    ...createTransactionQueries(sql, identity, input("income", { destinationAccountId: ids.foreign, destinationCurrency: "USD", destinationAmount: "2" })),
    ...createTransactionQueries(sql, identity, input("transfer")),
    check(sql`(SELECT count FROM (${historyQuery(sql, identity, { ...filters, type: "expense", account: ids.source, category: ids.expense, from: "2026-09-02", to: "2026-09-02", q: `${prefix.toLowerCase()} CAFÉ 100%_` })}) h) = 1`),
    check(sql`(SELECT jsonb_array_length(totals) FROM (${historyQuery(sql, identity, filters)}) h) = 2`),
    check(sql`EXISTS(SELECT 1 FROM (${historyQuery(sql, identity, filters)}) h, jsonb_array_elements(h.totals) t WHERE t->>'currency' = 'DOP' AND (t->>'net')::numeric = 99.9999)`),
    check(sql`(SELECT count FROM (${historyQuery(sql, identity, { ...filters, from: "2026-09-03" })}) h) = 0`),
  ];
});
await runCase("límites de día según zona horaria y paginación estable", () => {
  const many = Array.from({ length: 23 }, (_, index) => input("expense", { description: `${prefix} ${index}`, occurredLocal: index === 0 ? "2026-09-01T23:59" : index === 1 ? "2026-09-03T00:00" : "2026-09-02T00:00" }));
  return [...many.flatMap(v => createTransactionQueries(sql, identity, v)),
    check(sql`(SELECT count FROM (${historyQuery(sql, identity, { ...filters, from: "2026-09-02", to: "2026-09-02" })}) h) = 21`),
    check(sql`(SELECT jsonb_array_length(transactions) FROM (${historyQuery(sql, identity, filters)}) h) = 20`),
    check(sql`(SELECT jsonb_array_length(transactions) FROM (${historyQuery(sql, identity, { ...filters, page: 2 })}) h) = 3`),
    check(sql`NOT EXISTS(SELECT 1 FROM (${historyQuery(sql, identity, filters)}) a, (${historyQuery(sql, identity, { ...filters, page: 2 })}) b, jsonb_array_elements(a.transactions) x, jsonb_array_elements(b.transactions) y WHERE x->>'id' = y->>'id')`),
  ];
});
await runCase("saldo inicial y moneda no cambian después del primer movimiento", () => [
  ...createTransactionQueries(sql, identity, input()), lockAccountQuery(sql, identity, ids.source),
  updateAccountQuery(sql, identity, { id: ids.source, name: prefix, accountType: "cash", currency: "USD", openingBalance: "999", creditLimit: null, institution: "", description: "", color: "#0B6B58" }, "2026-01-01T00:00:00Z"),
  check(sql`EXISTS(SELECT 1 FROM pagato.accounts WHERE id = ${ids.source}::uuid AND currency_code = 'DOP' AND opening_balance = 500)`),
]);
await runCase("moneda modificada desde otro formulario no reinterpreta el monto", () => {
  const v = input();
  return [sql`UPDATE pagato.accounts SET currency_code = 'USD' WHERE id = ${ids.source}::uuid`, ...createTransactionQueries(sql, identity, v), exists(v.id, false)];
});
try {
  await sql.transaction([...setup(), ...createTransactionQueries(sql, identity, input("income", { destinationAccountId: ids.source, destinationAmount: "999999999999999" })), checkBalancesQuery(sql, identity), sql.query("DO $$ BEGIN RAISE EXCEPTION 'EXPECTED_OVERFLOW_NOT_TRIGGERED'; END $$")]);
  assert.fail("Debía abortarse el movimiento por desbordamiento.");
} catch (error) {
  assert.equal(error.code, "22003", "El exceso de saldo debe abortar toda la operación.");
}
assert.equal((await sql`SELECT id FROM pagato.accounts WHERE id = ${ids.source}::uuid`).length, 0, "Las cuentas de prueba también deben revertirse.");
console.log("OK: exceso de saldo revierte toda la operación.");
console.log("17 escenarios completados. No se conservaron movimientos ni cuentas de prueba.");
