import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is required to run database migrations");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "../database/migrations/drizzle",
  dbCredentials: { url: process.env.DIRECT_URL },
  schemaFilter: ["pagato"],
  strict: true,
  verbose: true,
});
