import { randomBytes } from "node:crypto";
import { z } from "zod";
import { FixedWindowRateLimiter } from "@/lib/security/fixed-window-rate-limit";

const schema = z.object({
  name: z.enum(["CLS", "FCP", "INP", "LCP", "TTFB", "PAGE_VIEW"]),
  value: z.number().finite().min(0).max(1_000_000_000),
  rating: z.enum(["good", "needs-improvement", "poor", "none"]),
  route: z.enum(["/", "/privacy", "/terms", "/auth/sign-in", "/auth/sign-up", "/auth/forgot-password", "/auth/reset-password", "/accounts", "/budgets", "/budgets/[id]", "/categories", "/dashboard", "/settings", "/transactions", "/other"]),
}).strict();
const limiter = new FixedWindowRateLimiter(process.env.NEON_AUTH_COOKIE_SECRET ?? randomBytes(32).toString("base64url"), 5_000);

function response(status: number) {
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > 4_096) return response(413);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return response(403);
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (!limiter.consume("telemetry", address.slice(0, 64), 120, 10 * 60_000).allowed) return response(429);

  let payload: unknown;
  try { payload = await request.json(); } catch { return response(400); }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return response(400);
  if (process.env.NODE_ENV === "production") console.info("[telemetry] Métrica web.", parsed.data);
  return response(204);
}
