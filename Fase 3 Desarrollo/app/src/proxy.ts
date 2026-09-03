import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { hasAuthEnv } from "@/lib/env/server";

export function proxy(request: NextRequest) {
  if (!hasAuthEnv()) return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  return getAuth().middleware({ loginUrl: "/auth/sign-in" })(request);
}

export const config = { matcher: ["/dashboard/:path*", "/accounts/:path*", "/categories/:path*", "/settings/:path*", "/transactions/:path*", "/budgets/:path*"] };
