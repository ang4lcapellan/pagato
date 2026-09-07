import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { savePlanQueries, planDetailQuery, listPlansQuery, planStatusQueries } from "../../src/modules/budgets/plans/repository.ts";
import { createTransactionQueries, updateTransactionQueries, deleteTransactionQuery } from "../../src/modules/transactions/server/repository.ts";
import { updateBudgetQueries, budgetStatusQueries } from "../../src/modules/budgets/server/repository.ts";
config({ path: ".env.local", quiet: true });
const connection = process.env.DATABASE_URL;
if (!connection || !new URL(connection).hostname.startsWith("ep-withered-cake-axjxdd0s")) throw new Error("Prueba limitada a development.");
const sql = neon(connection);
const sessions = await sql`SELECT DISTINCT ON (s."userId") s."userId"::text AS user_id, s.id::text AS session_id
  FROM neon_auth.session s JOIN pagato.app_users p ON p.auth_subject = s."userId"::text
  WHERE s."expiresAt" > now() AND p.status = 'active' AND p.deleted_at IS NULL
    AND (${process.env.PAGATO_TEST_AUTH_SUBJECT ?? null}::text IS NULL OR s."userId"::text = ${process.env.PAGATO_TEST_AUTH_SUBJECT ?? null})
  ORDER BY s."userId", s."createdAt" DESC LIMIT 2`;
assert.equal(sessions.length, 1, "Selecciona una sesión de prueba con PAGATO_TEST_AUTH_SUBJECT si hay varias.");
const identity = { userId: sessions[0].user_id, sessionId: sessions[0].session_id };
const ids = Object.fromEntries(["a", "b", "usd", "food", "bus", "income", "other", "otherCategory", "otherPlan"].map(key => [key, randomUUID()]));
const prefix = `QA-MONTHLY-${randomUUID()}`;
const plan = (extra = {}) => ({ id: randomUUID(), requestId: randomUUID(), mode: "create", version: 0, name: prefix, month: "2098-02", currency: "DOP", amount: "1000", expectedIncome: "1500", allocations: [{ categoryId: ids.food, amount: "600" }, { categoryId: ids.bus, amount: "200" }], ...extra });
const transaction = (extra = {}) => ({ id: randomUUID(), type: "expense", sourceAccountId: ids.a, destinationAccountId: null, sourceCurrency: "DOP", destinationCurrency: "DOP", sourceAmount: "100", destinationAmount: null, categoryId: ids.food, occurredLocal: "2098-02-05T12:00", description: prefix, notes: "", paymentMethod: "", ...extra });
const check = condition => sql`SELECT 1 / CASE WHEN (${condition}) THEN 1 ELSE 0 END`;
const state = (id, condition) => check(sql`EXISTS(SELECT 1 FROM (${planDetailQuery(sql, identity, id)}) d WHERE ${condition})`);
function setup() {
  return [sql`INSERT INTO pagato.accounts(id, user_id, name, account_type, currency_code, opening_balance)
    SELECT f.id, p.id, ${prefix}, 'cash', f.currency, 1000 FROM pagato.app_users p
    CROSS JOIN(VALUES (${ids.a}::uuid, 'DOP'), (${ids.b}::uuid, 'DOP'), (${ids.usd}::uuid, 'USD')) f(id,currency) WHERE p.auth_subject = ${identity.userId}`,
    sql`INSERT INTO pagato.categories(id,user_id,name,category_type)
    SELECT f.id, p.id, ${prefix} || f.suffix, f.type FROM pagato.app_users p
    CROSS JOIN(VALUES (${ids.food}::uuid, ' Food', 'expense'), (${ids.bus}::uuid, ' Bus', 'expense'), (${ids.income}::uuid, ' Income', 'income')) f(id,suffix,type) WHERE p.auth_subject = ${identity.userId}`];
}
let completed = 0;
async function runCase(label, build, expectedCode) {
  try {
    await sql.transaction([...setup(), ...build(), sql.query("DO $$ BEGIN RAISE EXCEPTION 'MONTHLY_PLAN_ROLLBACK'; END $$")], { isolationLevel: "ReadCommitted" });
    assert.fail("Debe revertirse.");
  } catch (error) {
    if (expectedCode ? error.code !== expectedCode : error.message !== "MONTHLY_PLAN_ROLLBACK") throw new Error(`Falló ${label}: código ${error.code ?? "desconocido"}`);
  }
  completed++; console.log(`OK: ${label}; cambios revertidos.`);
}
await runCase("crear padre e hijos, incluyendo plan vacío", () => {
  const p = plan(), empty = plan({ month: "2098-03", allocations: [] });
  return [...savePlanQueries(sql, identity, p), state(p.id, sql`(d.plan->>'allocated')::numeric = 800 AND jsonb_array_length(d.budgets) = 2 AND d.plan->>'periodEnd' = '2098-02-28'`),
    ...savePlanQueries(sql, identity, empty), state(empty.id, sql`jsonb_array_length(d.budgets) = 0 AND (d.plan->>'allocated')::numeric = 0`)];
});
await runCase("guardar distribución y reenviar sin duplicar o cambiar la versión", () => {
  const p = plan(), edited = { ...p, mode: "edit", version: 1, requestId: randomUUID(), allocations: [{ categoryId: ids.food, amount: "700.0001" }] };
  return [...savePlanQueries(sql, identity, p), ...savePlanQueries(sql, identity, p), state(p.id, sql`(d.plan->>'version')::int = 1 AND jsonb_array_length(d.budgets) = 2`),
    ...savePlanQueries(sql, identity, edited), ...savePlanQueries(sql, identity, edited),
    state(p.id, sql`(d.plan->>'allocated')::numeric = 700.0001 AND (d.plan->>'version')::int = 2 AND jsonb_array_length(d.budgets) = 1`),
    ...savePlanQueries(sql, identity, { ...edited, amount: "999" }), state(p.id, sql`(d.plan->>'amount')::numeric = 1000`)];
});
await runCase("rechazar suma excesiva, categorías repetidas y referencias no válidas", () => {
  const bad = [plan({ amount: "799" }), plan({ allocations: [{ categoryId: ids.food, amount: "10" }, { categoryId: ids.food, amount: "10" }] }), plan({ allocations: [{ categoryId: ids.income, amount: "10" }] })];
  return bad.flatMap(p => [...savePlanQueries(sql, identity, p), check(sql`NOT EXISTS(${planDetailQuery(sql, identity, p.id)})`)]);
});
await runCase("sesión inválida no puede consultar ni escribir", () => {
  const p = plan(), invalid = { ...identity, sessionId: randomUUID() };
  return [...savePlanQueries(sql, invalid, p), check(sql`NOT EXISTS(${listPlansQuery(sql, invalid, { month: "", status: "all", page: 1 })})`),
    ...savePlanQueries(sql, identity, p), ...savePlanQueries(sql, invalid, { ...p, mode: "edit", version: 1, requestId: randomUUID(), amount: "1", allocations: [] }),
    ...planStatusQueries(sql, invalid, p.id, 1, "archived"), state(p.id, sql`(d.plan->>'amount')::numeric = 1000 AND d.plan->>'status' = 'active'`)];
});
await runCase("el consumo real incluye gastos fuera de las categorías asignadas", () => {
  const p = plan({ allocations: [{ categoryId: ids.food, amount: "600" }] });
  return [...savePlanQueries(sql, identity, p), ...createTransactionQueries(sql, identity, transaction()),
    ...createTransactionQueries(sql, identity, transaction({ categoryId: ids.bus, sourceAmount: "50" })),
    ...createTransactionQueries(sql, identity, transaction({ type: "income", categoryId: ids.income, sourceAccountId: null, sourceAmount: null, destinationAccountId: ids.a, destinationAmount: "300" })),
    ...createTransactionQueries(sql, identity, transaction({ type: "transfer", categoryId: null, destinationAccountId: ids.b, destinationAmount: "100" })),
    ...createTransactionQueries(sql, identity, transaction({ sourceAccountId: ids.usd, sourceCurrency: "USD", sourceAmount: "700" })),
    state(p.id, sql`(d.plan->>'spent')::numeric = 150 AND (d.plan->>'categorySpent')::numeric = 100`)];
});
await runCase("editar y eliminar movimientos actualiza el total y las tarjetas", () => {
  const p = plan(), t = transaction();
  return [...savePlanQueries(sql, identity, p), ...createTransactionQueries(sql, identity, t),
    ...updateTransactionQueries(sql, identity, { ...t, sourceAmount: "250" }, 1), state(p.id, sql`(d.plan->>'spent')::numeric = 250`),
    deleteTransactionQuery(sql, identity, t.id, 2), state(p.id, sql`(d.plan->>'spent')::numeric = 0 AND (d.plan->>'categorySpent')::numeric = 0`)];
});
await runCase("copiar configuración sin gastos; incluir los gastos propios del mes nuevo", () => {
  const p = plan(), copied = plan({ month: "2098-03" });
  return [...savePlanQueries(sql, identity, p), ...createTransactionQueries(sql, identity, transaction()),
    ...createTransactionQueries(sql, identity, transaction({ occurredLocal: "2098-03-01T00:00", sourceAmount: "20" })),
    ...savePlanQueries(sql, identity, copied, { id: p.id, version: 1 }), ...savePlanQueries(sql, identity, copied, { id: p.id, version: 1 }),
    state(copied.id, sql`(d.plan->>'allocated')::numeric = 800 AND (d.plan->>'spent')::numeric = 20 AND d.plan->>'periodEnd' = '2098-03-31' AND (d.plan->>'version')::int = 1`),
    state(p.id, sql`(d.plan->>'spent')::numeric = 100`)];
});
await runCase("versiones obsoletas, origen cambiado y mes/moneda inmutables", () => {
  const p = plan(), copied = plan({ month: "2098-03" });
  return [...savePlanQueries(sql, identity, p), ...savePlanQueries(sql, identity, { ...p, requestId: randomUUID(), mode: "edit", version: 1, name: "Actualizado" }),
    ...savePlanQueries(sql, identity, { ...p, requestId: randomUUID(), mode: "edit", version: 1, amount: "900" }),
    ...savePlanQueries(sql, identity, { ...p, requestId: randomUUID(), mode: "edit", version: 2, month: "2098-04" }),
    ...savePlanQueries(sql, identity, { ...p, requestId: randomUUID(), mode: "edit", version: 2, currency: "USD" }),
    ...savePlanQueries(sql, identity, copied, { id: p.id, version: 1 }), check(sql`NOT EXISTS(${planDetailQuery(sql, identity, copied.id)})`),
    state(p.id, sql`d.plan->>'name' = 'Actualizado' AND (d.plan->>'amount')::numeric = 1000 AND d.plan->>'month' = '2098-02' AND d.plan->>'currency' = 'DOP'`)];
});
await runCase("archivar y reactivar conserva la distribución y los gastos", () => {
  const p = plan();
  return [...savePlanQueries(sql, identity, p), ...createTransactionQueries(sql, identity, transaction()), ...planStatusQueries(sql, identity, p.id, 1, "archived"),
    state(p.id, sql`d.plan->>'status' = 'archived' AND (d.plan->>'spent')::numeric = 100`), ...planStatusQueries(sql, identity, p.id, 2, "active"),
    state(p.id, sql`d.plan->>'status' = 'active' AND jsonb_array_length(d.budgets) = 2`)];
});
await runCase("no permitir dos planes activos del mismo mes y moneda", () => {
  return [...savePlanQueries(sql, identity, plan()), ...savePlanQueries(sql, identity, plan())];
}, "23505");
await runCase("aislar planes y categorías de otros usuarios", () => {
  const p = plan({ allocations: [{ categoryId: ids.otherCategory, amount: "10" }] });
  return [sql`INSERT INTO pagato.app_users(id,auth_subject,email,display_name) VALUES(${ids.other}::uuid, ${prefix}, ${`${ids.other}@example.invalid`}, 'QA temporal')`,
    sql`INSERT INTO pagato.categories(id,user_id,name,category_type) VALUES(${ids.otherCategory}::uuid,${ids.other}::uuid,${prefix},'expense')`,
    sql`INSERT INTO pagato.budget_plans(id,user_id,name,currency_code,amount,period_start,period_end,last_request_id,last_request_hash)
      VALUES(${ids.otherPlan}::uuid,${ids.other}::uuid,${prefix},'DOP',1000,'2098-02-01','2098-02-28',${randomUUID()}::uuid,'QA')`,
    ...savePlanQueries(sql, identity, p), check(sql`NOT EXISTS(${planDetailQuery(sql, identity, p.id)})`),
    ...savePlanQueries(sql, identity, plan({ id: ids.otherPlan, mode: "edit", version: 1 })),
    ...planStatusQueries(sql, identity, ids.otherPlan, 1, "archived"), check(sql`NOT EXISTS(${planDetailQuery(sql, identity, ids.otherPlan)})`),
    check(sql`EXISTS(SELECT 1 FROM pagato.budget_plans WHERE id = ${ids.otherPlan}::uuid AND version = 1 AND status = 'active')`)];
});
await runCase("las acciones individuales no pueden saltarse el límite mensual", () => {
  const p = plan();
  // Subqueries here are test-only SQL fragments substituted into typed parameters.
  const childId = sql`(SELECT id FROM pagato.budgets WHERE plan_id = ${p.id}::uuid AND category_id = ${ids.food}::uuid)`;
  const revision = sql`(SELECT updated_at FROM pagato.budgets WHERE id = ${childId})`;
  return [...savePlanQueries(sql, identity, p), ...updateBudgetQueries(sql, identity, { id: childId, categoryId: ids.food, name: prefix, currency: "DOP", amount: "9999", periodStart: "2098-02-01", periodEnd: "2098-02-28" }, revision),
    ...budgetStatusQueries(sql, identity, childId, revision, "archived"), state(p.id, sql`(d.plan->>'allocated')::numeric = 800 AND jsonb_array_length(d.budgets) = 2`)];
});
assert.equal((await sql`SELECT id FROM pagato.accounts WHERE id = ${ids.a}::uuid`).length, 0);
console.log(`${completed} escenarios mensuales completados sin conservar registros de prueba.`);
