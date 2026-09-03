"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
export function BudgetRetryButton() {
  const router = useRouter(); const [pending, start] = useTransition();
  return <button className="button button-primary mt-5" disabled={pending} onClick={() => start(() => router.refresh())}>{pending ? "Reintentando…" : "Reintentar"}</button>;
}
