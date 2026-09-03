import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { getFinancialProfile } from "@/modules/users/server/profile-service";
import { listCategories } from "@/modules/categories/server/repository";
import { CategoriesScreen } from "@/modules/categories/components/categories-screen";

export const metadata = { title: "Categorías" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const session = await requireSession();
  const result = await getFinancialProfile();
  if (result.status !== "ready") return <AppShell active="/settings" name="Mi cuenta"><h1 className="text-2xl font-bold">Tu perfil no está disponible</h1><p className="mt-3 text-[var(--muted)]">Necesitamos un perfil activo para mostrar tus categorías.</p><Link href="/dashboard" className="button button-secondary mt-5">Revisar mi perfil</Link></AppShell>;
  let categories;
  try {
    categories = await listCategories(getSqlClient(), { userId: session.user.id, sessionId: session.session.id });
  } catch {
    console.error("[categories] No se pudieron consultar las categorías.");
    categories = null;
  }
  return <AppShell active="/settings" name={result.profile.displayName}>
    {categories === null ? <section className="profile-card"><h1 className="text-2xl font-bold">No pudimos cargar tus categorías</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Comprueba tu conexión y que tu sesión siga activa. Tus datos guardados no se han modificado.</p><a href="/categories" className="button button-primary mt-5">Reintentar</a></section> : <CategoriesScreen categories={categories} />}
  </AppShell>;
}
