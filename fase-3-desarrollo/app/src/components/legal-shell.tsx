import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/modules/auth/components/brand-mark";

export function LegalShell({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children: ReactNode }) {
  return (
    <main className="legal-page">
      <header className="legal-header"><BrandMark /><Link className="button button-secondary" href="/">Volver al inicio</Link></header>
      <article className="legal-document">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-summary">{summary}</p>
        <p className="legal-updated">Última actualización: 6 de septiembre de 2026</p>
        <div className="legal-content">{children}</div>
      </article>
      <footer className="legal-footer"><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos y condiciones</Link></footer>
    </main>
  );
}
