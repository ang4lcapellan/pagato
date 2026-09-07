import "server-only";
import { z } from "zod";

const databaseUrl = z.string().url().startsWith("postgres").superRefine((value, context) => {
  const url = new URL(value);
  if (url.hostname.endsWith(".neon.tech") && !["require", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) {
    context.addIssue({ code: "custom", message: "DATABASE_URL must require TLS" });
  }
  if (process.env.NODE_ENV === "production" && url.hostname.endsWith(".neon.tech") && !url.hostname.includes("-pooler.")) {
    context.addIssue({ code: "custom", message: "Production DATABASE_URL must use the pooled Neon endpoint" });
  }
});
const databaseEnvSchema = z.object({ DATABASE_URL: databaseUrl });
const authEnvSchema = z.object({
  NEON_AUTH_BASE_URL: z.string().url().startsWith("https://"),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
});
const appUrlSchema = z.string().url().transform(value => new URL(value).origin).superRefine((value, context) => {
  if (process.env.NODE_ENV === "production" && !value.startsWith("https://")) {
    context.addIssue({ code: "custom", message: "APP_URL must use HTTPS in production" });
  }
});

export function getDatabaseEnv() {
  return databaseEnvSchema.parse({ DATABASE_URL: process.env.DATABASE_URL });
}

export function getAuthEnv() {
  return authEnvSchema.parse({
    NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
    NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET,
  });
}

export function hasAuthEnv() {
  return authEnvSchema.safeParse({
    NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
    NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET,
  }).success;
}

export function getAppUrl() {
  const fallback = process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";
  return appUrlSchema.parse(process.env.APP_URL ?? fallback);
}
