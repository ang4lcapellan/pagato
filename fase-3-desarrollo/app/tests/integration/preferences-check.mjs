import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { preferencesQuery, savePreferencesQuery } from "../../src/modules/preferences/server/repository.ts";
config({path:".env.local",quiet:true});
const connection=process.env.DATABASE_URL;
if(!connection||!new URL(connection).hostname.startsWith("ep-withered-cake-axjxdd0s"))throw new Error("Prueba limitada a development.");
const sql=neon(connection);
try {
 const sessions=await sql`SELECT DISTINCT ON (s."userId") s."userId"::text AS user_id,s.id::text AS session_id FROM neon_auth.session s JOIN pagato.app_users p ON p.auth_subject=s."userId"::text WHERE s."expiresAt">now() AND p.status='active' AND p.deleted_at IS NULL AND (${process.env.PAGATO_TEST_AUTH_SUBJECT??null}::text IS NULL OR s."userId"::text=${process.env.PAGATO_TEST_AUTH_SUBJECT??null}) ORDER BY s."userId",s."createdAt" DESC LIMIT 2`;
 assert.equal(sessions.length,1,"Se requiere una sesión activa única o PAGATO_TEST_AUTH_SUBJECT.");
 const who={userId:sessions[0].user_id,sessionId:sessions[0].session_id};
 const [before]=await preferencesQuery(sql,who); assert.ok(before);
 const values={theme:"dark",locale:"en",baseCurrency:"USD",timezone:"America/New_York",dateFormat:"MM/DD/YYYY",numberFormat:"dot-comma"};
 const check=condition=>sql`SELECT 1/CASE WHEN (${condition}) THEN 1 ELSE 0 END`;
 const fingerprint=sql`SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) AS hash FROM pagato.transactions t`;
 try {
  await sql.transaction([
   sql`CREATE TEMP TABLE pref_financial_before ON COMMIT DROP AS ${fingerprint}`,
   sql`CREATE TEMP TABLE pref_accounts_before ON COMMIT DROP AS SELECT md5(COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id)::text,'')) AS hash FROM pagato.accounts a`,
   savePreferencesQuery(sql,who,values,before.revision),
   check(sql`EXISTS(SELECT 1 FROM (${preferencesQuery(sql,who)}) p WHERE p.preferences->>'theme'='dark' AND p.preferences->>'locale'='en' AND p.preferences->>'numberFormat'='dot-comma' AND p.preferences->>'timezone'='America/New_York')`),
   sql`WITH changed AS (${savePreferencesQuery(sql,who,{...values,theme:"light"},before.revision)}) SELECT 1/CASE WHEN count(*)=0 THEN 1 ELSE 0 END FROM changed`,
   sql`WITH changed AS (${savePreferencesQuery(sql,{...who,sessionId:randomUUID()},values,before.revision)}) SELECT 1/CASE WHEN count(*)=0 THEN 1 ELSE 0 END FROM changed`,
   check(sql`NOT EXISTS(SELECT 1 FROM (${preferencesQuery(sql,{...who,userId:randomUUID()})}) p)`),
   check(sql`(SELECT hash FROM (${fingerprint}) f)=(SELECT hash FROM pref_financial_before)`),
   check(sql`(SELECT md5(COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id)::text,'')) FROM pagato.accounts a)=(SELECT hash FROM pref_accounts_before)`),
   sql.query("DO $$ BEGIN RAISE EXCEPTION 'PREFERENCES_TEST_ROLLBACK'; END $$")
  ]);
  assert.fail("La prueba debe revertirse");
 }catch(error){if(error.message!=="PREFERENCES_TEST_ROLLBACK")throw error;}
 const [after]=await preferencesQuery(sql,who);assert.deepEqual(after,before);
 console.log("OK: persistencia por usuario, sesión, control de versiones, precisión e integridad de cuentas/transacciones; preferencias originales conservadas tras rollback.");
}catch(error){console.error("Falló la prueba de preferencias: "+(error.code??"verificación o conexión"));process.exitCode=1;}
