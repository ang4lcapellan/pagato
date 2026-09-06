import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasAuthEnv } from "@/lib/env/server";
import { getAuth } from "./server";

export const getCurrentSession = cache(async () => {
  if (!hasAuthEnv()) return null;
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.getAll().some(cookie =>
    cookie.name.startsWith("__Secure-neon-auth") &&
    (cookie.name.endsWith(".session_token") || cookie.name.endsWith(".session_data")),
  );
  // Public visitors cannot have a server session without one of Neon Auth's
  // session cookies. Avoid making every public page depend on an auth request.
  if (!hasSessionCookie) return null;
  try {
    const { data, error } = await getAuth().getSession();
    if (error || !data?.user) return null;
    return data;
  } catch {
    return null;
  }
});

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/auth/sign-in");
  return session;
}
