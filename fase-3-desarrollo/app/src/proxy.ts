import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { hasAuthEnv } from "@/lib/env/server";

const protectedRoute = /^\/(dashboard|accounts|categories|settings|transactions|budgets)(?:\/|$)/;

function contentSecurityPolicy(nonce: string, secureRequest: boolean) {
  const development = process.env.NODE_ENV === "development";
  return `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'${development ? " ws://localhost:* ws://127.0.0.1:*" : ""}; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';${secureRequest ? " upgrade-insecure-requests;" : ""}`;
}

function secure(response: NextResponse, policy: string) {
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const secureRequest = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const policy = contentSecurityPolicy(nonce, secureRequest);
  // Neon Auth copies these request headers into its allow response. Next.js reads
  // the nonce from the request CSP and applies it to framework scripts.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", policy);

  if (!protectedRoute.test(request.nextUrl.pathname)) {
    return secure(NextResponse.next({ request: { headers: request.headers } }), policy);
  }
  if (!hasAuthEnv()) return secure(NextResponse.redirect(new URL("/auth/sign-in", request.url)), policy);
  return secure(await getAuth().middleware({ loginUrl: "/auth/sign-in" })(request), policy);
}

export const config = {
  matcher: [{
    source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|pwa/|brand/).*)",
    missing: [
      { type: "header", key: "next-router-prefetch" },
      { type: "header", key: "purpose", value: "prefetch" },
    ],
  }],
};
