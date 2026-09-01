import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseEnv } from "@/lib/env/server";

let database: ReturnType<typeof drizzle> | undefined;

export function getDatabase() {
  if (database) return database;
  const { DATABASE_URL } = getDatabaseEnv();
  database = drizzle(neon(DATABASE_URL));
  return database;
}
