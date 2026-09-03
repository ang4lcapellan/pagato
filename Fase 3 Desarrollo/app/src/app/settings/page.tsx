import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/ui/icon";
import { requireSession } from "@/lib/auth/session";

export const metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();
  return <AppShell active="/settings" name={session.user.name || "Mi cuenta"}>
    <header className="accounts-heading"><div><h1>Ajustes</h1><p>Organiza PagaTo a tu manera.</p></div></header>
    <section className="mt-8 max-w-3xl" aria-labelledby="organization-title"><h2 id="organization-title" className="mb-4 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Organización financiera</h2>
      <Link href="/categories" className="settings-category-link"><span className="empty-wallet"><Icon name="categories" /></span><div className="min-w-0 flex-1"><h3 className="text-base font-bold">Categorías</h3><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Personaliza cómo clasificas tus ingresos y gastos.</p></div><Icon name="arrow" className="shrink-0" /></Link>
      <Link href="/budgets" className="settings-category-link mt-4"><span className="empty-wallet"><Icon name="budget" /></span><div className="min-w-0 flex-1"><h3 className="text-base font-bold">Presupuestos</h3><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Define límites por categoría y sigue tus gastos.</p></div><Icon name="arrow" className="shrink-0" /></Link>
    </section>
    <p className="mt-6 max-w-xl text-sm leading-6 text-[var(--muted)]">Las preferencias de apariencia, idioma y otros ajustes se incorporarán en su módulo correspondiente.</p>
  </AppShell>;
}
