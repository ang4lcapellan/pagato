import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { getAuthEnv } from "@/lib/env/server";

let auth: ReturnType<typeof createNeonAuth> | undefined;

export function getAuth() {
  if (auth) return auth;
  const { NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET } = getAuthEnv();
  auth = createNeonAuth({
    baseUrl: NEON_AUTH_BASE_URL,
    cookies: { secret: NEON_AUTH_COOKIE_SECRET, sessionDataTtl: 300 },
    logLevel: "warn",
  });
  return auth;
}
