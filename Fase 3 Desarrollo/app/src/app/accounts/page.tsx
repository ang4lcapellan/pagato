import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { getFinancialProfile } from "@/modules/users/server/profile-service";
import { listAccounts } from "@/modules/accounts/server/repository";
import { AccountsScreen } from "@/modules/accounts/components/accounts-screen";

export const metadata = { title: "Cuentas" };
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await requireSession();
  const result = await getFinancialProfile();
  if (result.status !== "ready") return <AppShell active="/accounts" name="Mi cuenta"><h1 className="text-2xl font-bold">Tu perfil no está disponible</h1><p className="mt-3 text-[var(--muted)]">Necesitamos un perfil activo para mostrar tus cuentas.</p><Link href="/dashboard" className="button button-secondary mt-5">Revisar mi perfil</Link></AppShell>;
  let accounts;
  try {
    accounts = await listAccounts(getSqlClient(), { userId: session.user.id, sessionId: session.session.id });
  } catch {
    console.error("[accounts] No se pudieron consultar las cuentas.");
    accounts = null;
  }
  return <AppShell active="/accounts" name={result.profile.displayName}>
    {accounts === null ? <section className="profile-card"><h1 className="text-2xl font-bold">No pudimos cargar tus cuentas</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Comprueba tu conexión y que tu sesión siga activa. Tus datos guardados no se han modificado.</p><a href="/accounts" className="button button-primary mt-5">Reintentar</a></section> : <AccountsScreen accounts={accounts} defaultCurrency={result.profile.preferences.baseCurrency} />}
  </AppShell>;
}
