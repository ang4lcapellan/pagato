import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { dashboardQuery } from "../../src/modules/dashboard/server/repository.ts";
import { createTransactionQueries, updateTransactionQueries, deleteTransactionQuery } from "../../src/modules/transactions/server/repository.ts";
import { savePlanQueries } from "../../src/modules/budgets/plans/repository.ts";
import { createBudgetQueries } from "../../src/modules/budgets/server/repository.ts";
config({ path: ".env.local", quiet: true });
const connection = process.env.DATABASE_URL;
if (!connection || !new URL(connection).hostname.startsWith("ep-withered-cake-axjxdd0s")) throw new Error("Prueba limitada a development.");
const sql = neon(connection);
const sessions = await sql`SELECT DISTINCT ON (s."userId") s."userId"::text AS user_id, s.id::text AS session_id
  FROM neon_auth.session s JOIN pagato.app_users p ON p.auth_subject = s."userId"::text
  WHERE s."expiresAt" > now() AND p.status = 'active' AND p.deleted_at IS NULL
    AND (${process.env.PAGATO_TEST_AUTH_SUBJECT ?? null}::text IS NULL OR s."userId"::text = ${process.env.PAGATO_TEST_AUTH_SUBJECT ?? null})
  ORDER BY s."userId", s."createdAt" DESC LIMIT 2`;
assert.equal(sessions.length, 1, "Requiere una sesión activa; si hay varias, define PAGATO_TEST_AUTH_SUBJECT.");
const identity = { userId: sessions[0].user_id, sessionId: sessions[0].session_id };
const ids = Object.fromEntries(["a", "b", "usd", "archived", "food", "income", "other", "otherAccount", "plan", "budget"].map(key => [key, randomUUID()]));
const prefix = `QA-DASHBOARD-${randomUUID()}`;
const filters = { period: "month", currency: "DOP", month: "2098-02", year: "2098", from: "", to: "" };
const range = { from: "2098-02-01", to: "2098-02-28", bucket: "week" };
const query = (f = filters, r = range, who = identity) => dashboardQuery(sql, who, f, r);
const check = condition => sql`SELECT 1 / CASE WHEN (${condition}) THEN 1 ELSE 0 END`;
const state = (condition, f = filters, r = range, baseline = "dashboard_baseline") => check(sql`EXISTS(SELECT 1 FROM (${query(f, r)}) d CROSS JOIN ${sql.unsafe(baseline)} b WHERE ${condition})`);
const transaction = (extra = {}) => ({ id: randomUUID(), type: "expense", sourceAccountId: ids.a, destinationAccountId: null, sourceCurrency: "DOP", destinationCurrency: "DOP", sourceAmount: "100", destinationAmount: null, categoryId: ids.food, occurredLocal: "2098-02-05T12:00", description: prefix, notes: "", paymentMethod: "", ...extra });
function setup() {
  return [sql`CREATE TEMP TABLE dashboard_baseline ON COMMIT DROP AS ${query()}`,
    sql`CREATE TEMP TABLE dashboard_usd ON COMMIT DROP AS ${query({ ...filters, currency: "USD" })}`,
    sql`INSERT INTO pagato.accounts(id, user_id, name, account_type, currency_code, opening_balance)
      SELECT f.id, p.id, ${prefix}, 'cash', f.currency, 1000 FROM pagato.app_users p
      CROSS JOIN(VALUES (${ids.a}::uuid, 'DOP'), (${ids.b}::uuid, 'DOP'), (${ids.archived}::uuid, 'DOP'), (${ids.usd}::uuid, 'USD')) f(id,currency) WHERE p.auth_subject = ${identity.userId}`,
    sql`INSERT INTO pagato.categories(id,user_id,name,category_type)
      SELECT f.id, p.id, ${prefix} || f.suffix, f.type FROM pagato.app_users p
      CROSS JOIN(VALUES (${ids.food}::uuid, ' Food', 'expense'), (${ids.income}::uuid, ' Income', 'income')) f(id,suffix,type) WHERE p.auth_subject = ${identity.userId}`];
}
let completed = 0;
async function runCase(label, build) {
  try {
    await sql.transaction([...setup(), ...build(), sql.query("DO $$ BEGIN RAISE EXCEPTION 'DASHBOARD_ROLLBACK'; END $$")], { isolationLevel: "RepeatableRead" });
    assert.fail("Debe revertirse.");
  } catch (error) {
    if (error.message !== "DASHBOARD_ROLLBACK") throw new Error(`Falló ${label}: código ${error.code ?? "desconocido"}; ${error.message === "division by zero" ? "aserción de datos" : "consulta no completada"}`);
  }
  completed++; console.log(`OK: ${label}; cambios revertidos.`);
}
await runCase("saldos, ingresos y gastos separados por moneda; transferencias excluidas", () => [
  ...createTransactionQueries(sql, identity, transaction()),
  ...createTransactionQueries(sql, identity, transaction({ type: "income", sourceAccountId: null, sourceAmount: null, destinationAccountId: ids.a, destinationAmount: "500.0001", categoryId: ids.income })),
  ...createTransactionQueries(sql, identity, transaction({ type: "transfer", destinationAccountId: ids.b, destinationAmount: "200", sourceAmount: "200", categoryId: null })),
  ...createTransactionQueries(sql, identity, transaction({ sourceAccountId: ids.usd, sourceCurrency: "USD", sourceAmount: "70" })),
  state(sql`d.income::numeric = b.income::numeric + 500.0001 AND d.expense::numeric = b.expense::numeric + 100 AND d.balance::numeric = b.balance::numeric + 3400.0001 AND d."accountCount" = b."accountCount" + 3`),
  state(sql`d.expense::numeric = b.expense::numeric + 70 AND d.balance::numeric = b.balance::numeric + 930`, { ...filters, currency: "USD" }, range, "dashboard_usd"),
  state(sql`(SELECT sum((v->>'income')::numeric) FROM jsonb_array_elements(d.trend) v) = d.income::numeric AND (SELECT sum((v->>'expense')::numeric) FROM jsonb_array_elements(d.trend) v) = d.expense::numeric AND jsonb_array_length(d.trend) = 4`),
]);
await runCase("transferencias entre monedas no inventan ingresos o gastos", () => [
  ...createTransactionQueries(sql, identity, transaction({ type: "transfer", sourceAmount: "6000", destinationAccountId: ids.usd, destinationCurrency: "USD", destinationAmount: "100", categoryId: null })),
  state(sql`d.income = b.income AND d.expense = b.expense AND d.balance::numeric = b.balance::numeric - 3000 AND EXISTS(SELECT 1 FROM jsonb_array_elements(d.recent) t WHERE t->>'destinationCurrency' = 'USD' AND t->>'description' = ${prefix})`),
  state(sql`d.income = b.income AND d.expense = b.expense AND d.balance::numeric = b.balance::numeric + 1100`, { ...filters, currency: "USD" }, range, "dashboard_usd"),
]);
await runCase("cuentas archivadas conservan historial pero no el saldo total activo", () => [
  ...createTransactionQueries(sql, identity, transaction({ sourceAccountId: ids.archived, sourceAmount: "25" })),
  sql`UPDATE pagato.accounts SET status = 'archived' WHERE id = ${ids.archived}::uuid`,
  state(sql`d.expense::numeric = b.expense::numeric + 25 AND d.balance::numeric = b.balance::numeric + 2000 AND d."accountCount" = b."accountCount" + 2`),
]);
await runCase("fechas inclusivas en zona local y saldo independiente del período", () => [
  ...["2098-02-01T00:00", "2098-02-28T23:59", "2098-01-31T23:59", "2098-03-01T00:00"].flatMap(occurredLocal => createTransactionQueries(sql, identity, transaction({ occurredLocal }))),
  state(sql`d.expense::numeric = b.expense::numeric + 200 AND d.balance::numeric = b.balance::numeric + 2600`),
  check(sql`(SELECT balance FROM (${query()}) d) = (SELECT balance FROM (${query(filters, { from: "2098-02-01", to: "2098-02-01", bucket: "day" })}) d)`),
]);
await runCase("editar y eliminar actualiza métricas, distribución y saldo", () => {
  const t = transaction();
  return [...createTransactionQueries(sql, identity, t), ...updateTransactionQueries(sql, identity, { ...t, sourceAmount: "125.0001" }, 1),
    state(sql`d.expense::numeric = b.expense::numeric + 125.0001`), deleteTransactionQuery(sql, identity, t.id, 2),
    state(sql`d.expense = b.expense AND d.income = b.income AND d.balance::numeric = b.balance::numeric + 3000 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d.recent) t WHERE t->>'id' = ${t.id})`)];
});
await runCase("distribución top 5 + otras, historial acotado, bloques vacíos", () => {
  const categories = Array.from({ length: 7 }, () => randomUUID());
  return categories.flatMap((id, i) => [sql`INSERT INTO pagato.categories(id,user_id,name,category_type) SELECT ${id}::uuid,id,${prefix + i},'expense' FROM pagato.app_users WHERE auth_subject = ${identity.userId}`,
    ...createTransactionQueries(sql, identity, transaction({ categoryId: id, sourceAmount: String((i + 1) * 100) }))]).concat([
    state(sql`jsonb_array_length(d.distribution) = 6 AND jsonb_array_length(d.recent) = 5 AND (SELECT sum((v->>'amount')::numeric) FROM jsonb_array_elements(d.distribution) v) = d.expense::numeric AND EXISTS(SELECT 1 FROM jsonb_array_elements(d.trend) v WHERE (v->>'expense')::numeric = 0)`),
  ]);
});
await runCase("presupuesto padre sin duplicar hijos y consumo de su período completo", () => {
  const plan = { id: ids.plan, requestId: randomUUID(), mode: "create", version: 0, name: prefix, month: "2098-02", currency: "DOP", amount: "1000", expectedIncome: null, allocations: [{ categoryId: ids.food, amount: "500" }] };
  const budget = { id: ids.budget, categoryId: ids.food, name: prefix, currency: "DOP", amount: "200", periodStart: "2098-02-10", periodEnd: "2098-02-20" };
  return [...savePlanQueries(sql, identity, plan), ...createBudgetQueries(sql, identity, budget),
    ...createTransactionQueries(sql, identity, transaction({ occurredLocal: "2098-02-15T12:00", sourceAmount: "250" })),
    state(sql`d."budgetCount" = b."budgetCount" + 2 AND EXISTS(SELECT 1 FROM jsonb_array_elements(d.budgets) v WHERE v->>'id' = ${ids.plan} AND (v->>'spent')::numeric >= 250)`),
    state(sql`EXISTS(SELECT 1 FROM jsonb_array_elements(d.budgets) v WHERE v->>'id' = ${ids.plan} AND (v->>'spent')::numeric >= 250)`, filters, { from: "2098-02-01", to: "2098-02-01", bucket: "day" }),
  ];
});
await runCase("aislamiento de usuarios y sesiones inválidas", () => [
  sql`INSERT INTO pagato.app_users(id,auth_subject,email,display_name) VALUES(${ids.other}::uuid, ${prefix}, ${ids.other + "@example.invalid"}, 'QA temporal')`,
  sql`INSERT INTO pagato.accounts(id,user_id,name,account_type,currency_code,opening_balance) VALUES(${ids.otherAccount}::uuid,${ids.other}::uuid,${prefix},'cash','DOP',999999)`,
  state(sql`d.balance::numeric = b.balance::numeric + 3000`),
  check(sql`NOT EXISTS(${query(filters, range, { ...identity, sessionId: randomUUID() })})`),
  check(sql`NOT EXISTS(${query(filters, range, { ...identity, userId: randomUUID() })})`),
]);
assert.equal((await sql`SELECT id FROM pagato.accounts WHERE id = ${ids.a}::uuid OR id = ${ids.otherAccount}::uuid`).length, 0);
assert.equal((await sql`SELECT id FROM pagato.categories WHERE name LIKE ${prefix + "%"}`).length, 0);
console.log(`${completed} escenarios de dashboard completados sin conservar registros de prueba.`);
