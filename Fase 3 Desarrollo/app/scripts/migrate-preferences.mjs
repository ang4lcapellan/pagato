import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: ".env.local", quiet: true });
const connection = process.env.DIRECT_URL;
if (!connection || new URL(connection).hostname !== "ep-withered-cake-axjxdd0s.c-4.us-east-2.aws.neon.tech") throw new Error("Migración limitada a development de PagaTo.");
const sql = neon(connection);
try {
  const source = await readFile("../database/migrations/0003_preferences_number_format.sql", "utf8");
  const queries = [sql.query(source)];
  if (!process.argv.includes("--apply")) queries.push(sql.query("DO $$ BEGIN RAISE EXCEPTION 'PREFERENCES_MIGRATION_ROLLBACK'; END $$"));
  try { await sql.transaction(queries); }
  catch (error) { if (error.message === "PREFERENCES_MIGRATION_ROLLBACK") { console.log("Migración validada y revertida; datos intactos."); process.exit(0); } throw error; }
  const [state] = await sql`SELECT count(*)::int AS invalid FROM pagato.user_preferences WHERE number_format NOT IN ('comma-dot', 'dot-comma') OR number_format IS NULL`;
  if (state.invalid !== 0) throw new Error("Verificar formato numérico.");
  console.log("Formato numérico disponible en development. No se modificaron registros financieros.");
} catch (error) { console.error(`Migración no completada: ${error.code ?? "conexión o verificación"}.`); process.exitCode = 1; }
