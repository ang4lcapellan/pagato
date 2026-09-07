"use client";
import { DashboardUnavailable } from "@/modules/dashboard/components/dashboard-states";
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="dashboard-route-state"><DashboardUnavailable retry={retry} /></main>;
}
