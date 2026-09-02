import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseEnv } from "@/lib/env/server";

let database: ReturnType<typeof drizzle> | undefined;
let sqlClient: NeonQueryFunction<false, false> | undefined;

export function getSqlClient() {
  if (sqlClient) return sqlClient;
  const { DATABASE_URL } = getDatabaseEnv();
  sqlClient = neon(DATABASE_URL);
  return sqlClient;
}

export function getDatabase() {
  if (database) return database;
  database = drizzle(getSqlClient());
  return database;
}
