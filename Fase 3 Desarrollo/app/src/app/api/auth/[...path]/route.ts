import { getAuth } from "@/lib/auth/server";
import { hasAuthEnv } from "@/lib/env/server";

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
  if (!hasAuthEnv()) return notConfigured();
  return getAuth().handler().POST(request, context);
}
