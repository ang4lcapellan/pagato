"use server";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { listAccounts } from "@/modules/accounts/server/repository";
import { listCategories } from "@/modules/categories/server/repository";

export async function loadDashboardOptionsAction() {
  const session = await requireSession();
  try {
    const sql = getSqlClient();
    const identity = { userId: session.user.id, sessionId: session.session.id };
    const [accounts, categories] = await Promise.all([listAccounts(sql, identity), listCategories(sql, identity)]);
    if (accounts && categories) return { status: "ready" as const, accounts, categories };
  } catch { console.error("[dashboard] No se pudieron cargar las opciones de registro."); }
  return { status: "error" as const, message: "No pudimos abrir el formulario. Revisa la conexión y que tu sesión siga activa." };
}
