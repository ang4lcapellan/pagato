import "server-only";
import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseEnv } from "@/lib/env/server";

let database: ReturnType<typeof drizzle> | undefined;
let sqlClient: NeonQueryFunction<false, false> | undefined;
const platformFetch = globalThis.fetch.bind(globalThis);

neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  const started = performance.now();
  const timeout = AbortSignal.timeout(15_000);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    const response = await platformFetch(input, { ...init, cache: "no-store", signal });
    const duration = Math.round(performance.now() - started);
    if (duration >= 1_500) console.warn("[database] Consulta lenta detectada.", { duration, status: response.status });
    return response;
  } catch (error) {
    console.error("[database] Falló una solicitud a PostgreSQL.", { duration: Math.round(performance.now() - started) });
    throw error;
  }
};

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
