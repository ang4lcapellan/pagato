import { BrandMark } from "@/modules/auth/components/brand-mark";

export function AppPageLoading({ label }: { label: string }) {
  return <div className="route-loading-shell" role="status" aria-live="polite" aria-label={label}>
    <header><BrandMark /><span className="route-skeleton route-skeleton-avatar" aria-hidden="true" /></header>
    <main>
      <span className="sr-only">{label}</span>
      <div className="route-skeleton route-skeleton-title" aria-hidden="true" />
      <div className="route-skeleton route-skeleton-subtitle" aria-hidden="true" />
      <div className="route-skeleton-grid" aria-hidden="true">
        <div className="route-skeleton route-skeleton-card" /><div className="route-skeleton route-skeleton-card" /><div className="route-skeleton route-skeleton-card" />
      </div>
      <div className="route-skeleton route-skeleton-panel" aria-hidden="true" />
    </main>
  </div>;
}
