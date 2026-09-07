import "server-only";

import { createHmac } from "node:crypto";
import { getAuthEnv } from "@/lib/env/server";
import { FixedWindowRateLimiter, type RateLimitResult } from "./fixed-window-rate-limit";

export type RateLimitPolicy = { identityLimit: number; ipLimit: number; windowMs: number };

let limiter: FixedWindowRateLimiter | undefined;

function getLimiter() {
  if (!limiter) {
    const secret = createHmac("sha256", getAuthEnv().NEON_AUTH_COOKIE_SECRET)
      .update("pagato-auth-rate-limit-v1")
      .digest("base64url");
    limiter = new FixedWindowRateLimiter(secret);
  }
  return limiter;
}

function clientAddress(headers: Headers) {
  const value = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
  return /^[0-9a-f:.]{1,64}$/i.test(value) ? value.toLowerCase() : "unknown";
}

export function enforceAuthRateLimit(scope: string, identity: string, headers: Headers, policy: RateLimitPolicy): RateLimitResult {
  const store = getLimiter();
  const address = clientAddress(headers);
  const byIp = store.consume(scope + ":ip", address, policy.ipLimit, policy.windowMs);
  const normalizedIdentity = identity.trim().toLocaleLowerCase("en").slice(0, 254) || "anonymous";
  const byIdentity = store.consume(scope + ":identity", normalizedIdentity, policy.identityLimit, policy.windowMs);
  return !byIp.allowed ? byIp : byIdentity;
}

export function enforceIpRateLimit(scope: string, headers: Headers, limit: number, windowMs: number): RateLimitResult {
  return getLimiter().consume(scope + ":ip", clientAddress(headers), limit, windowMs);
}

export function rateLimitMessage(retryAfter: number) {
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  return "Demasiados intentos. Espera " + minutes + " " + (minutes === 1 ? "minuto" : "minutos") + " antes de intentarlo otra vez.";
}
