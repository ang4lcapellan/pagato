import Image from "next/image";
import Link from "next/link";

export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link className={`inline-flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 ${inverted ? "focus-visible:outline-white" : "focus-visible:outline-[var(--brand)]"}`} href="/" aria-label="PagaTo, inicio">
      <Image className={`size-12 rounded-2xl ${inverted ? "shadow-lg shadow-emerald-950/20" : "shadow-sm shadow-emerald-900/10"}`} src="/brand/pagato-mark.svg" alt="" width={64} height={64} priority />
      <span className={`text-xl font-extrabold tracking-[-0.03em] ${inverted ? "text-white" : "text-[var(--ink)]"}`}>PagaTo’</span>
    </Link>
  );
}
