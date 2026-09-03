import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: ".env.local", quiet: true });
const connection = process.env.DIRECT_URL;
if (!connection || !new URL(connection).hostname.startsWith("ep-withered-cake-axjxdd0s")) throw new Error("Migración limitada a development de PagaTo.");
const sql = neon(connection);
try {
  const [state] = await sql`SELECT to_regclass('pagato.budget_plans') IS NOT NULL AS applied, (SELECT count(*)::int FROM pagato.budgets) AS budgets`;
  if (state.applied) { console.log("La migración mensual ya está aplicada."); process.exit(0); }
  const source = await readFile("../database/migrations/0002_monthly_budget_plans.sql", "utf8");
  // This migration contains plain DDL only (no procedural blocks or semicolons in literals).
  const statements = source.split(";").map(s => s.trim()).filter(s => s && s !== "BEGIN" && s !== "COMMIT");
  const queries = statements.map(statement => sql.query(statement));
  if (!process.argv.includes("--apply")) queries.push(sql.query("DO $$ BEGIN RAISE EXCEPTION 'PLAN_MIGRATION_ROLLBACK'; END $$"));
  try { await sql.transaction(queries); }
  catch (error) { if (error.message === "PLAN_MIGRATION_ROLLBACK") { console.log("Migración validada y revertida. No se modificaron datos."); process.exit(0); } throw error; }
  const [after] = await sql`SELECT (SELECT count(*)::int FROM pagato.budgets) AS budgets,
    (SELECT count(*)::int FROM pagato.budgets WHERE plan_id IS NOT NULL) AS assigned`;
  if (after.budgets !== state.budgets || after.assigned !== 0) throw new Error("Revisar preservación de presupuestos.");
  console.log("Migración mensual aplicada. Presupuestos anteriores conservados sin reasignar.");
} catch (error) { console.error(`No se completó la migración: ${error.code ?? "error de conexión o verificación"}.`); process.exitCode = 1; }
