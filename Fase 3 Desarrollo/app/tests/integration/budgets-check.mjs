import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { createBudgetQueries, updateBudgetQueries, budgetStatusQueries, listBudgetsQuery } from "../../src/modules/budgets/server/repository.ts";
import { createTransactionQueries, updateTransactionQueries, deleteTransactionQuery } from "../../src/modules/transactions/server/repository.ts";

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
const ids = Object.fromEntries(["a", "b", "usd", "expense", "income", "budget", "other", "otherCategory", "otherBudget"].map(k => [k, randomUUID()]));
const prefix = `QA-BUDGET-${randomUUID()}`;
const filters = { month: "2096-02", status: "all", page: 1 };
const input = (extra = {}) => ({ id: ids.budget, name: prefix, categoryId: ids.expense, currency: "DOP", amount: "1000", periodStart: "2096-02-01", periodEnd: "2096-02-29", ...extra });
const movement = (extra = {}) => ({ id: randomUUID(), type: "expense", sourceCurrency: "DOP", destinationCurrency: "DOP", sourceAccountId: ids.a, destinationAccountId: null,
  categoryId: ids.expense, sourceAmount: "100.0001", destinationAmount: null, occurredLocal: "2096-02-10T12:30", description: prefix, notes: "", paymentMethod: "", ...extra });
const check = condition => sql`SELECT 1 / CASE WHEN (${condition}) THEN 1 ELSE 0 END`;
const rev = id => sql`(SELECT updated_at FROM pagato.budgets WHERE id = ${id}::uuid)`;
const hasBudget = (id, exists = true) => check(sql`EXISTS(SELECT 1 FROM pagato.budgets WHERE id = ${id}::uuid) = ${exists}`);
const spent = (value, id = ids.budget, f = filters) => check(sql`EXISTS(SELECT 1 FROM (${listBudgetsQuery(sql, identity, f)}) q,
  jsonb_array_elements(q.budgets) b WHERE b->>'id' = ${id} AND (b->>'spent')::numeric = ${value}::numeric)`);
function setup() {
  return [
    sql`INSERT INTO pagato.accounts (id, user_id, name, account_type, currency_code, opening_balance)
      SELECT f.id, p.id, ${prefix}, 'cash', f.currency, 10000 FROM pagato.app_users p
      CROSS JOIN (VALUES (${ids.a}::uuid, 'DOP'), (${ids.b}::uuid, 'DOP'), (${ids.usd}::uuid, 'USD')) f(id, currency) WHERE p.auth_subject = ${identity.userId}`,
    sql`INSERT INTO pagato.categories (id, user_id, name, category_type)
      SELECT f.id, p.id, ${prefix}, f.type FROM pagato.app_users p
      CROSS JOIN (VALUES (${ids.expense}::uuid, 'expense'), (${ids.income}::uuid, 'income')) f(id, type) WHERE p.auth_subject = ${identity.userId}`,
  ];
}
let count = 0;
async function runCase(label, build) {
  try {
    await sql.transaction([...setup(), ...build(), sql.query("DO $$ BEGIN RAISE EXCEPTION 'PAGATO_BUDGETS_ROLLBACK'; END $$")], { isolationLevel: "ReadCommitted" });
    assert.fail("La prueba debe revertirse.");
  } catch (error) {
    if (error.message !== "PAGATO_BUDGETS_ROLLBACK") throw new Error(`Falló ${label}; código ${error.code ?? "desconocido"}`);
  }
  count += 1;
  console.log(`OK: ${label}; cambios revertidos.`);
}
await runCase("crear con gastos previos y sumar todas las cuentas de la misma moneda", () => [
  ...createTransactionQueries(sql, identity, movement()), ...createTransactionQueries(sql, identity, movement({ sourceAccountId: ids.b })),
  ...createBudgetQueries(sql, identity, input()), spent("200.0002"),
]);
await runCase("excluir ingresos, transferencias, otra moneda y gastos eliminados", () => {
  const deleted = movement();
  return [...createBudgetQueries(sql, identity, input()), ...createTransactionQueries(sql, identity, movement()),
    ...createTransactionQueries(sql, identity, movement({ type: "income", sourceAccountId: null, sourceAmount: null, destinationAccountId: ids.a, destinationAmount: "300", categoryId: ids.income })),
    ...createTransactionQueries(sql, identity, movement({ type: "transfer", destinationAccountId: ids.b, destinationAmount: "100.0001", categoryId: null })),
    ...createTransactionQueries(sql, identity, movement({ sourceAccountId: ids.usd, sourceCurrency: "USD", sourceAmount: "500" })),
    ...createTransactionQueries(sql, identity, deleted), deleteTransactionQuery(sql, identity, deleted.id, 1), spent("100.0001")];
});
await runCase("el progreso cambia al editar, reclasificar y eliminar gastos", () => {
  const v = movement();
  return [...createBudgetQueries(sql, identity, input()), ...createTransactionQueries(sql, identity, v), spent("100.0001"),
    ...updateTransactionQueries(sql, identity, { ...v, sourceAmount: "250" }, 1), spent("250"),
    ...updateTransactionQueries(sql, identity, { ...v, occurredLocal: "2096-03-01T00:00" }, 2), spent("0"),
    ...updateTransactionQueries(sql, identity, v, 3), spent("100.0001"),
    deleteTransactionQuery(sql, identity, v.id, 4), spent("0")];
});
await runCase("período inclusivo y zona horaria en ambos límites del día", () => [
  ...createBudgetQueries(sql, identity, input()),
  ...createTransactionQueries(sql, identity, movement({ occurredLocal: "2096-01-31T23:59" })),
  ...createTransactionQueries(sql, identity, movement({ occurredLocal: "2096-02-01T00:00", sourceAmount: "10" })),
  ...createTransactionQueries(sql, identity, movement({ occurredLocal: "2096-02-29T23:59", sourceAmount: "20" })),
  ...createTransactionQueries(sql, identity, movement({ occurredLocal: "2096-03-01T00:00" })), spent("30"),
]);
await runCase("reenvíos idempotentes, cambio de payload y fechas solapadas", () => {
  const v = input(), overlap = input({ id: randomUUID(), periodStart: "2096-02-29", periodEnd: "2096-03-10" });
  const different = createBudgetQueries(sql, identity, { ...v, amount: "2000" });
  const next = input({ id: randomUUID(), periodStart: "2096-03-01", periodEnd: "2096-03-31" });
  return [...createBudgetQueries(sql, identity, v), ...createBudgetQueries(sql, identity, v), ...different,
    check(sql`NOT EXISTS(${different.at(-1)})`), ...createBudgetQueries(sql, identity, overlap), hasBudget(overlap.id, false),
    ...createBudgetQueries(sql, identity, next), hasBudget(next.id),
    check(sql`(SELECT count(*) FROM pagato.budgets WHERE id = ${v.id}::uuid) = 1`)];
});
await runCase("editar límite y período; rechazar revisión obsoleta", () => {
  const v = input();
  return [...createBudgetQueries(sql, identity, v), ...createTransactionQueries(sql, identity, movement()),
    ...updateBudgetQueries(sql, identity, { ...v, amount: "500", periodEnd: "2096-02-05" }, rev(v.id)), spent("0"),
    ...updateBudgetQueries(sql, identity, { ...v, amount: "5" }, "1900-01-01T00:00:00Z"),
    check(sql`EXISTS(SELECT 1 FROM pagato.budgets WHERE id = ${v.id}::uuid AND amount = 500 AND period_end = '2096-02-05')`)];
});
await runCase("archivar no modifica movimientos y permite reactivar sin solapamientos", () => {
  const v = input();
  return [...createBudgetQueries(sql, identity, v), ...createTransactionQueries(sql, identity, movement()),
    ...budgetStatusQueries(sql, identity, v.id, rev(v.id), "archived"), spent("100.0001", v.id, { ...filters, status: "archived" }),
    ...budgetStatusQueries(sql, identity, v.id, rev(v.id), "active"), spent("100.0001", v.id, { ...filters, status: "active" }),
    check(sql`(SELECT current_balance FROM pagato.account_balances WHERE account_id = ${ids.a}::uuid) = 9899.9999`)];
});
await runCase("no reactivar un archivado que solapa otro activo", () => {
  const v = input(), other = input({ id: randomUUID() });
  return [...createBudgetQueries(sql, identity, v), ...budgetStatusQueries(sql, identity, v.id, rev(v.id), "archived"),
    ...createBudgetQueries(sql, identity, other), ...budgetStatusQueries(sql, identity, v.id, rev(v.id), "active"),
    check(sql`EXISTS(SELECT 1 FROM pagato.budgets WHERE id = ${v.id}::uuid AND status = 'archived')`)];
});
await runCase("rechazar categorías de ingreso o inactivas; conservar progreso histórico", () => {
  const income = input({ id: randomUUID(), categoryId: ids.income });
  const inactive = input({ id: randomUUID(), periodStart: "2096-03-01", periodEnd: "2096-03-31" });
  return [...createBudgetQueries(sql, identity, input()), ...createTransactionQueries(sql, identity, movement()),
    ...createBudgetQueries(sql, identity, income), hasBudget(income.id, false),
    sql`UPDATE pagato.categories SET is_active = false WHERE id = ${ids.expense}::uuid`,
    ...createBudgetQueries(sql, identity, inactive), hasBudget(inactive.id, false), spent("100.0001"),
    ...budgetStatusQueries(sql, identity, ids.budget, rev(ids.budget), "archived"),
    ...budgetStatusQueries(sql, identity, ids.budget, rev(ids.budget), "active"),
    check(sql`EXISTS(SELECT 1 FROM pagato.budgets WHERE id = ${ids.budget}::uuid AND status = 'archived')`)];
});
await runCase("sesión inválida no puede leer, crear, editar ni archivar", () => {
  const invalid = { ...identity, sessionId: randomUUID() }, fresh = input({ id: randomUUID() });
  return [...createBudgetQueries(sql, identity, input()), ...createBudgetQueries(sql, invalid, fresh), hasBudget(fresh.id, false),
    ...updateBudgetQueries(sql, invalid, input({ amount: "1" }), rev(ids.budget)),
    ...budgetStatusQueries(sql, invalid, ids.budget, rev(ids.budget), "archived"),
    check(sql`NOT EXISTS(${listBudgetsQuery(sql, invalid, filters)})`),
    check(sql`EXISTS(SELECT 1 FROM pagato.budgets WHERE id = ${ids.budget}::uuid AND amount = 1000 AND status = 'active')`)];
});
await runCase("aislamiento de presupuestos y categorías ajenas", () => {
  const foreignCategory = input({ categoryId: ids.otherCategory });
  return [
    sql`INSERT INTO pagato.app_users (id, auth_subject, email, display_name) VALUES (${ids.other}::uuid, ${prefix}, ${`${ids.other}@example.invalid`}, 'QA temporal')`,
    sql`INSERT INTO pagato.categories (id, user_id, name, category_type) VALUES (${ids.otherCategory}::uuid, ${ids.other}::uuid, ${prefix}, 'expense')`,
    sql`INSERT INTO pagato.budgets (id, user_id, category_id, name, amount, currency_code, period_start, period_end)
      VALUES (${ids.otherBudget}::uuid, ${ids.other}::uuid, ${ids.otherCategory}::uuid, ${prefix}, 500, 'DOP', '2096-02-01', '2096-02-29')`,
    ...createBudgetQueries(sql, identity, foreignCategory), hasBudget(foreignCategory.id, false),
    ...updateBudgetQueries(sql, identity, input({ id: ids.otherBudget }), rev(ids.otherBudget)),
    ...budgetStatusQueries(sql, identity, ids.otherBudget, rev(ids.otherBudget), "archived"),
    check(sql`EXISTS(SELECT 1 FROM pagato.budgets WHERE id = ${ids.otherBudget}::uuid AND amount = 500 AND status = 'active')`),
    check(sql`NOT EXISTS(SELECT 1 FROM (${listBudgetsQuery(sql, identity, filters)}) q, jsonb_array_elements(q.budgets) b WHERE b->>'id' = ${ids.otherBudget})`),
  ];
});
await runCase("no limitar ni desbordar la suma de gastos de un presupuesto", () => [
  ...createBudgetQueries(sql, identity, input({ amount: "0.0001" })),
  ...createTransactionQueries(sql, identity, movement({ sourceAmount: "999999999999999.9999" })),
  ...createTransactionQueries(sql, identity, movement({ sourceAccountId: ids.b, sourceAmount: "999999999999999.9999" })), spent("1999999999999999.9998"),
]);
assert.equal((await sql`SELECT id FROM pagato.budgets WHERE id = ${ids.budget}::uuid`).length, 0);
assert.equal((await sql`SELECT id FROM pagato.accounts WHERE id = ${ids.a}::uuid`).length, 0);
console.log(`${count} escenarios completados. No se conservaron presupuestos ni movimientos de prueba.`);
