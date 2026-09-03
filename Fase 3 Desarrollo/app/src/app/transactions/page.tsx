import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { getFinancialProfile } from "@/modules/users/server/profile-service";
import { listAccounts } from "@/modules/accounts/server/repository";
import { listCategories } from "@/modules/categories/server/repository";
import { historyUrl, PAGE_SIZE, transactionFiltersSchema } from "@/modules/transactions/model";
import { getHistory } from "@/modules/transactions/server/repository";
import { TransactionsScreen } from "@/modules/transactions/components/transactions-screen";

export const metadata = { title: "Transacciones" };
export const dynamic = "force-dynamic";
export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const result = await getFinancialProfile();
  const parsed = transactionFiltersSchema.safeParse(await searchParams);
  if (result.status !== "ready") return <AppShell active="/transactions" name="Mi cuenta"><h1 className="text-2xl font-bold">Tu perfil no está disponible</h1><p className="mt-3 text-[var(--muted)]">Necesitamos un perfil activo para consultar tus movimientos.</p><Link href="/dashboard" className="button button-secondary mt-5">Revisar mi perfil</Link></AppShell>;
  if (!parsed.success) return <AppShell active="/transactions" name={result.profile.displayName}><section className="profile-card"><h1 className="text-2xl font-bold">Revisa los filtros</h1><p className="mt-3 text-sm leading-6">Indica fechas válidas, con la fecha inicial anterior o igual a la final. La búsqueda admite hasta 240 caracteres.</p><Link href="/transactions" className="button button-primary mt-5">Restablecer filtros</Link></section></AppShell>;
  const identity = { userId: session.user.id, sessionId: session.session.id };
  let data;
  try {
    const sql = getSqlClient();
    const [history, accounts, categories] = await Promise.all([getHistory(sql, identity, parsed.data), listAccounts(sql, identity), listCategories(sql, identity)]);
    if (history && accounts && categories) data = { history, accounts, categories };
  } catch { console.error("[transactions] No se pudo consultar el historial."); }
  if (data && parsed.data.page > Math.max(1, Math.ceil(data.history.count / PAGE_SIZE))) redirect(historyUrl(parsed.data, Math.max(1, Math.ceil(data.history.count / PAGE_SIZE))));
  return <AppShell active="/transactions" name={result.profile.displayName}>{data ? <TransactionsScreen {...data} filters={parsed.data} /> : <section className="profile-card"><h1 className="text-2xl font-bold">No pudimos cargar tus movimientos</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Comprueba tu conexión y que tu sesión siga activa. Tus registros no se han modificado.</p><a href="/transactions" className="button button-primary mt-5">Reintentar</a></section>}</AppShell>;
}
