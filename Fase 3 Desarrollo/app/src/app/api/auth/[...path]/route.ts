import { getAuth } from "@/lib/auth/server";
import { hasAuthEnv } from "@/lib/env/server";
import { enforceIpRateLimit } from "@/lib/security/rate-limit";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

function notConfigured() {
  return Response.json(
    { error: "Authentication is not configured" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request, context: AuthRouteContext) {
  if (!hasAuthEnv()) return notConfigured();
  return getAuth().handler().GET(request, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
    return Response.json({ error: "Request body too large" }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }
  if (!hasAuthEnv()) return notConfigured();
  const limit = enforceIpRateLimit("auth-api", request.headers, 30, 10 * 60_000);
  if (!limit.allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retryAfter) } });
  }
  return getAuth().handler().POST(request, context);
}
