import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/modules/auth/components/brand-mark";
import { signOutAction } from "@/modules/auth/actions";
import { Icon } from "./ui/icon";

const navigation = [
  { label: "Inicio", icon: "home", href: "/dashboard" },
  { label: "Movimientos", icon: "movements", href: "/transactions" },
  { label: "Cuentas", icon: "wallet", href: "/accounts" },
  { label: "Presupuestos", icon: "budget", href: "/budgets" },
  { label: "Ajustes", icon: "settings", href: "/settings" },
] as const;

export function AppShell({ active, name, children }: { active: "/accounts" | "/dashboard" | "/settings" | "/transactions" | "/budgets"; name: string; children: ReactNode }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const links = (mobile: boolean) => navigation.filter((item) => !mobile || item.icon !== "budget").map((item) => (
    <Link key={item.icon} href={item.href} aria-current={active === item.href ? "page" : undefined} className="app-nav-item"><Icon name={item.icon} /><span>{item.label}</span></Link>
  ));
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside className="app-sidebar">
        <BrandMark />
        <nav aria-label="Navegación principal" className="mt-8 space-y-2">{links(false)}</nav>
        <div className="mt-auto border-t border-[var(--border)] pt-5">
          <div className="flex items-center gap-3"><span className="user-avatar">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="text-xs text-[var(--muted)]">Cuenta personal</p></div></div>
          <form action={signOutAction} className="mt-3"><button className="button button-secondary w-full text-sm">Cerrar sesión</button></form>
        </div>
      </aside>
      <header className="app-mobile-header"><BrandMark /><span className="user-avatar" aria-label={`Perfil de ${name}`}>{initials}</span></header>
      <main id="main-content" className="app-content">{children}</main>
      <nav className="app-bottom-nav" aria-label="Navegación móvil">{links(true)}</nav>
    </div>
  );
}
