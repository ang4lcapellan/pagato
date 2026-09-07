import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { createCategoryQueries, updateCategoryQuery, categoryStatusQuery, listCategoriesQuery } from "../../src/modules/categories/server/repository.ts";

config({ path: ".env.local", quiet: true });
const connection = process.env.DATABASE_URL;
if (!connection || !new URL(connection).hostname.startsWith("ep-withered-cake-axjxdd0s")) throw new Error("Prueba limitada a development de PagaTo.");
const sql = neon(connection);
const requestedUser = process.env.PAGATO_TEST_AUTH_SUBJECT;
const sessions = await sql`SELECT DISTINCT ON (s."userId") s."userId"::text AS user_id, s.id::text AS session_id
  FROM neon_auth.session s JOIN pagato.app_users p ON p.auth_subject = s."userId"::text
  WHERE s."expiresAt" > now() AND p.status = 'active' AND p.deleted_at IS NULL
    AND (${requestedUser ?? null}::text IS NULL OR s."userId"::text = ${requestedUser ?? null})
  ORDER BY s."userId", s."createdAt" DESC LIMIT 2`;
assert.equal(sessions.length, 1, "Requiere una sesión de prueba activa. Con varios usuarios, define PAGATO_TEST_AUTH_SUBJECT.");
const identity = { userId: sessions[0].user_id, sessionId: sessions[0].session_id };
const [initialDefault] = await sql`SELECT c.id, c.name, c.category_type AS "categoryType", c.icon, c.color,
  to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS revision
  FROM pagato.categories c JOIN pagato.app_users p ON p.id = c.user_id
  WHERE p.auth_subject = ${identity.userId} AND c.is_default AND c.code = 'salary' AND c.category_type = 'income'`;
assert.ok(initialDefault, "Se requiere el perfil de prueba con categorías iniciales.");
const input = { id: randomUUID(), name: `QA ${randomUUID()}`, categoryType: "expense", icon: "pet", color: "#16A085" };
const fixedRevision = "2026-01-01T00:00:00.000000Z";

async function runCase(label, build, { active = true, expectedCode } = {}) {
  const setup = sql`INSERT INTO pagato.categories (id, user_id, name, category_type, icon, color, updated_at, is_active)
    SELECT ${input.id}::uuid, p.id, ${input.name}, 'expense', 'pet', '#16A085', ${fixedRevision}::timestamptz, ${active}
    FROM pagato.app_users p WHERE p.auth_subject = ${identity.userId}`;
  const rollback = sql.query("DO $$ BEGIN RAISE EXCEPTION 'PAGATO_CATEGORIES_ROLLBACK'; END $$");
  try {
    await sql.transaction([setup, ...build(), rollback]);
    assert.fail("Faltó revertir la prueba.");
  } catch (error) {
    const passed = expectedCode ? error.code === expectedCode : error.message === "PAGATO_CATEGORIES_ROLLBACK";
    if (!passed) throw new Error(`Falló ${label}; código ${error.code ?? "desconocido"}`);
  }
  console.log(`OK: ${label}; cambios revertidos.`);
}

await runCase("crear, listar y repetir solicitud sin duplicados", () => {
  const fresh = { ...input, id: randomUUID(), name: `QA nueva ${randomUUID()}` };
  return [...createCategoryQueries(sql, identity, fresh), ...createCategoryQueries(sql, identity, fresh),
    sql`SELECT 1 / CASE WHEN (SELECT count(*) FROM pagato.categories WHERE id = ${fresh.id}::uuid AND NOT is_default AND code IS NULL) = 1
      AND EXISTS(SELECT 1 FROM (${listCategoriesQuery(sql, identity)}) result, jsonb_array_elements(result.categories) c WHERE c->>'id' = ${fresh.id} AND c->>'categoryType' = 'expense') THEN 1 ELSE 0 END`];
});
await runCase("rechazar nombre duplicado sin distinguir mayúsculas, incluso inactivo", () => [
  ...createCategoryQueries(sql, identity, { ...input, id: randomUUID(), name: input.name.toUpperCase() }),
], { active: false, expectedCode: "23505" });
await runCase("permitir mismo nombre en ingreso y gasto", () => [
  ...createCategoryQueries(sql, identity, { ...input, id: randomUUID(), categoryType: "income" }),
  sql`SELECT 1 / CASE WHEN (SELECT count(*) FROM pagato.categories WHERE name = ${input.name}) = 2 THEN 1 ELSE 0 END`,
]);
await runCase("editar nombre, icono y color", () => [
  updateCategoryQuery(sql, identity, { ...input, name: "QA editada", icon: "gift", color: "#9B51E0" }, fixedRevision),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${input.id}::uuid AND name = 'QA editada' AND icon = 'gift' AND color = '#9B51E0' AND NOT is_default AND category_type = 'expense') THEN 1 ELSE 0 END`,
]);
await runCase("no sobrescribir una revisión obsoleta ni cambiar el tipo", () => [
  updateCategoryQuery(sql, identity, { ...input, name: "QA incorrecta" }, "2000-01-01T00:00:00Z"),
  updateCategoryQuery(sql, identity, { ...input, categoryType: "income" }, fixedRevision),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${input.id}::uuid AND name = ${input.name} AND category_type = 'expense') THEN 1 ELSE 0 END`,
]);
await runCase("desactivar", () => [
  categoryStatusQuery(sql, identity, input.id, fixedRevision, "inactive"),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${input.id}::uuid AND NOT is_active) THEN 1 ELSE 0 END`,
]);
await runCase("reactivar", () => [
  categoryStatusQuery(sql, identity, input.id, fixedRevision, "active"),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${input.id}::uuid AND is_active) THEN 1 ELSE 0 END`,
], { active: false });
await runCase("predeterminadas conservan personalización y código al preparar el perfil", () => [
  updateCategoryQuery(sql, identity, { ...initialDefault, name: `QA salario ${input.id}`, icon: "briefcase", color: "#0B6B58" }, initialDefault.revision),
  sql`SELECT pagato.seed_default_categories(p.id) FROM pagato.app_users p WHERE p.auth_subject = ${identity.userId}`,
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${initialDefault.id}::uuid AND name = ${`QA salario ${input.id}`} AND code = 'salary' AND is_default AND icon = 'briefcase')
    AND (SELECT count(*) FROM pagato.categories c JOIN pagato.app_users p ON p.id = c.user_id WHERE p.auth_subject = ${identity.userId} AND c.code = 'salary') = 1 THEN 1 ELSE 0 END`,
]);
await runCase("predeterminadas desactivadas no se reactivan al preparar el perfil", () => [
  categoryStatusQuery(sql, identity, initialDefault.id, initialDefault.revision, "inactive"),
  sql`SELECT pagato.seed_default_categories(p.id) FROM pagato.app_users p WHERE p.auth_subject = ${identity.userId}`,
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${initialDefault.id}::uuid AND NOT is_active AND is_default) THEN 1 ELSE 0 END`,
]);
await runCase("sesión inválida no puede leer, crear, editar ni desactivar", () => {
  const invalid = { ...identity, sessionId: "00000000-0000-0000-0000-000000000000" };
  const fresh = { ...input, id: randomUUID() };
  return [...createCategoryQueries(sql, invalid, fresh), updateCategoryQuery(sql, invalid, { ...input, name: "QA no autorizada" }, fixedRevision), categoryStatusQuery(sql, invalid, input.id, fixedRevision, "inactive"),
    sql`SELECT 1 / CASE WHEN NOT EXISTS(${listCategoriesQuery(sql, invalid)}) AND NOT EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${fresh.id}::uuid)
      AND EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${input.id}::uuid AND name = ${input.name} AND is_active) THEN 1 ELSE 0 END`];
});
await runCase("aislamiento de categorías de otro perfil", () => {
  const otherUser = randomUUID(); const otherCategory = randomUUID();
  return [sql`INSERT INTO pagato.app_users (id, auth_subject, email, display_name) VALUES (${otherUser}::uuid, ${`qa-${otherUser}`}, ${`${otherUser}@example.invalid`}, 'QA temporal')`,
    sql`INSERT INTO pagato.categories (id, user_id, name, category_type, updated_at) VALUES (${otherCategory}::uuid, ${otherUser}::uuid, 'QA ajena', 'expense', ${fixedRevision}::timestamptz)`,
    updateCategoryQuery(sql, identity, { ...input, id: otherCategory }, fixedRevision), categoryStatusQuery(sql, identity, otherCategory, fixedRevision, "inactive"), ...createCategoryQueries(sql, identity, { ...input, id: otherCategory }),
    sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${otherCategory}::uuid AND name = 'QA ajena' AND user_id = ${otherUser}::uuid AND is_active)
      AND NOT EXISTS(SELECT 1 FROM (${listCategoriesQuery(sql, identity)}) result, jsonb_array_elements(result.categories) c WHERE c->>'id' = ${otherCategory}) THEN 1 ELSE 0 END`];
});

function linkedRecords() {
  const account = randomUUID();
  return [sql`INSERT INTO pagato.accounts (id, user_id, name, account_type, currency_code) SELECT ${account}::uuid, c.user_id, 'QA cuenta temporal', 'cash', 'DOP' FROM pagato.categories c WHERE c.id = ${input.id}::uuid`,
    sql`INSERT INTO pagato.transactions (user_id, transaction_type, source_account_id, source_amount, category_id, occurred_at) SELECT c.user_id, 'expense', ${account}::uuid, 5, c.id, now() FROM pagato.categories c WHERE c.id = ${input.id}::uuid`,
    sql`INSERT INTO pagato.budgets (user_id, category_id, name, amount, currency_code, period_start, period_end) SELECT c.user_id, c.id, 'QA presupuesto temporal', 30, 'DOP', '2026-09-01', '2026-09-30' FROM pagato.categories c WHERE c.id = ${input.id}::uuid`];
}
await runCase("desactivar conserva movimientos y presupuestos", () => [
  ...linkedRecords(), categoryStatusQuery(sql, identity, input.id, fixedRevision, "inactive"),
  sql`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pagato.categories WHERE id = ${input.id}::uuid AND NOT is_active)
    AND EXISTS(SELECT 1 FROM pagato.transactions WHERE category_id = ${input.id}::uuid AND source_amount = 5 AND deleted_at IS NULL)
    AND EXISTS(SELECT 1 FROM pagato.budgets WHERE category_id = ${input.id}::uuid AND amount = 30) THEN 1 ELSE 0 END`,
]);
await runCase("el esquema rechaza nuevos gastos en una categoría inactiva", () => [
  ...linkedRecords(), categoryStatusQuery(sql, identity, input.id, fixedRevision, "inactive"),
  sql`INSERT INTO pagato.transactions (user_id, transaction_type, source_account_id, source_amount, category_id, occurred_at)
    SELECT t.user_id, 'expense', t.source_account_id, 9, t.category_id, now() FROM pagato.transactions t WHERE t.category_id = ${input.id}::uuid`,
], { expectedCode: "23514" });
console.log("Comprobaciones terminadas: todos los cambios fueron revertidos, incluidas las categorías iniciales.");
