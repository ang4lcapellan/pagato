import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { hasAuthEnv } from "@/lib/env/server";
import { getAuth } from "./server";

export const getCurrentSession = cache(async () => {
  if (!hasAuthEnv()) return null;
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
