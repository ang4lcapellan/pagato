import { signOutAction } from "@/modules/auth/actions";
import { BrandMark } from "@/modules/auth/components/brand-mark";
import { getFinancialProfile } from "@/modules/users/server/profile-service";
import { ProfileSummary } from "@/modules/users/components/profile-summary";
import Link from "next/link";

export const metadata = { title: "Panel principal" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const result = await getFinancialProfile();
  const profile = result.status === "ready" ? result.profile : null;
  const firstName = profile?.displayName.trim().split(/\s+/)[0] || "bienvenido";

  return (
    <main className="min-h-svh bg-[var(--surface)] px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-3 sm:rounded-2xl sm:border sm:border-[var(--border)] sm:bg-white sm:px-5 sm:py-4">
          <BrandMark />
          <form action={signOutAction}>
            <button className="button button-secondary text-sm" type="submit">Cerrar sesión</button>
          </form>
        </header>

        {profile ? <>
        <section className="auth-grid mt-8 rounded-3xl bg-[var(--brand-dark)] p-6 text-white sm:p-10">
          <p className="text-sm font-semibold text-white/72">Panel principal</p>
          <h1 className="mt-3 break-words text-[1.75rem] font-bold leading-9 sm:text-[2.5rem] sm:leading-12">Hola, {firstName}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base">Tu perfil financiero está listo. Guardamos tus preferencias y preparamos tus categorías para comenzar.</p>
        </section>

        <ProfileSummary profile={profile} />
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/transactions" className="button button-primary">Ver movimientos</Link><Link href="/accounts" className="button button-secondary">Ir a mis cuentas</Link><Link href="/categories" className="button button-secondary">Gestionar categorías</Link></div>
        <Link href="/budgets" className="button button-secondary mt-3">Ver presupuestos</Link>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Ya puedes registrar movimientos y definir presupuestos por categoría. El progreso se calcula a partir de tus gastos. Los gráficos se incorporarán en el módulo Dashboard.</p>
        </> : <section className="profile-card mt-8" aria-labelledby="profile-error-title">
          <h1 id="profile-error-title" className="text-xl font-semibold">
            {result.status === "inactive" ? "Tu perfil no está disponible" : result.status === "invalid-session" ? "Necesitas iniciar sesión de nuevo" : "No pudimos preparar tu perfil"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {result.status === "inactive" ? "El perfil está suspendido o eliminado. No modificamos sus preferencias ni sus categorías." : result.status === "invalid-session" ? "Tu sesión venció o dejó de estar activa. Cierra esta sesión y vuelve a entrar." : "Tu cuenta de acceso sigue creada. Comprueba la conexión y vuelve a intentarlo; no necesitas registrarte otra vez."}
          </p>
          {result.status === "unavailable" && <a className="button button-primary mt-5" href="/dashboard">Reintentar</a>}
        </section>}
      </div>
    </main>
  );
}
