import type { ReactNode } from "react";
import { BrandMark } from "./brand-mark";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <main className="auth-page grid place-items-center px-5 py-8 sm:px-8 sm:py-12">
      <section className="auth-grid auth-card relative z-10 grid w-full max-w-[68rem] overflow-hidden rounded-3xl border border-emerald-950/10 bg-white lg:min-h-[43rem] lg:grid-cols-[.86fr_1.14fr]">
        <aside className="auth-panel hidden flex-col justify-between p-10 text-white lg:flex xl:p-12">
          <BrandMark inverted />
          <div className="relative z-10 max-w-sm">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-white/70">Claridad para tu día</p>
            <h2 className="mt-5 text-[2.5rem] font-bold leading-[1.12] tracking-[-.04em]">Tu dinero, más simple y bajo control.</h2>
            <p className="mt-5 text-base leading-7 text-white/78">Una experiencia segura para organizar tus cuentas, entender tus movimientos y avanzar con calma.</p>
          </div>
          <div className="relative z-10 flex items-center gap-3 text-sm text-white/76">
            <span className="grid size-8 place-items-center rounded-full bg-white/12" aria-hidden="true">✓</span>
            Sesiones seguras protegidas por Neon Auth
          </div>
        </aside>

        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden"><BrandMark /></div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-dark)]">{eyebrow}</p>
            <h1 className="mt-3 text-[2rem] font-bold leading-10 tracking-[-.035em] text-[var(--ink)] sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
