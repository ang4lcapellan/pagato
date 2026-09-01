import "server-only";
import { z } from "zod";

const databaseEnvSchema = z.object({ DATABASE_URL: z.string().url().startsWith("postgres") });
const authEnvSchema = z.object({
  NEON_AUTH_BASE_URL: z.string().url().startsWith("https://"),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
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
