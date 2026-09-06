"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
export function BudgetRetryButton() {
  const { t: tr } = usePresentation();
  const router = useRouter(); const [pending, start] = useTransition();
  return <button className="button button-primary mt-5" disabled={pending} onClick={() => start(() => router.refresh())}>{pending ? tr("Reintentando…") : tr("Reintentar")}</button>;
}
