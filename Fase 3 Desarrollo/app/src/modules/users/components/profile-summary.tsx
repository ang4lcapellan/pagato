import type { FinancialProfile } from "../types";

const themeLabels = { light: "Claro", dark: "Oscuro", system: "Según tu dispositivo" };

export function ProfileSummary({ profile }: { profile: FinancialProfile }) {
  const totalCategories = profile.defaultCategories.income + profile.defaultCategories.expense;
  return (
    <section className="mt-6" aria-labelledby="profile-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="profile-title" className="text-xl font-semibold leading-7">Tu perfil financiero</h2>
        <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-dark)]">Perfil conectado</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="profile-card min-w-0">
          <h3 className="text-sm font-semibold">Datos de tu perfil</h3>
          <p className="mt-4 break-words font-bold">{profile.displayName}</p>
          <p className="mt-1 break-all text-sm leading-5 text-[var(--muted)]">{profile.email}</p>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Vinculado a tu cuenta de acceso.</p>
        </article>
        <article className="profile-card min-w-0">
          <h3 className="text-sm font-semibold">Preferencias guardadas</h3>
          <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm leading-5">
            <dt className="text-[var(--muted)]">Moneda</dt><dd className="text-right font-semibold">{profile.preferences.baseCurrency}</dd>
            <dt className="text-[var(--muted)]">Idioma</dt><dd className="text-right">{profile.preferences.locale === "es" ? "Español" : "English"}</dd>
            <dt className="text-[var(--muted)]">Tema</dt><dd className="text-right">{themeLabels[profile.preferences.theme]}</dd>
            <dt className="text-[var(--muted)]">Zona horaria</dt><dd className="break-words text-right">{profile.preferences.timezone.replaceAll("_", " ")}</dd>
            <dt className="text-[var(--muted)]">Fecha</dt><dd className="text-right">{profile.preferences.dateFormat}</dd>
          </dl>
        </article>
        <article className="profile-card min-w-0">
          <h3 className="text-sm font-semibold">Categorías iniciales</h3>
          <p className="mt-4 text-[2.5rem] font-bold leading-12 text-[var(--brand-dark)]">{totalCategories}<span className="ml-2 text-sm font-normal text-[var(--muted)]">categorías</span></p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{profile.defaultCategories.income} de ingresos y {profile.defaultCategories.expense} de gastos.</p>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Cada usuario tiene sus propias categorías. No se duplican al volver a entrar.</p>
        </article>
      </div>
    </section>
  );
}
