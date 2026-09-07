"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { accountInputSchema, accountRevisionSchema, accountStatusSchema, type AccountActionState } from "../model";
import { accountStatusQuery, createAccountQueries, updateAccountQuery, lockAccountQuery } from "./repository";

const unavailable: AccountActionState = { status: "error", message: "No pudimos guardar la cuenta. Revisa tu conexión e inténtalo de nuevo." };
const conflict: AccountActionState = { status: "error", message: "La cuenta cambió, tiene movimientos o ya no está disponible. Cierra este formulario y actualiza la página antes de reintentar." };

export async function saveAccountAction(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const session = await requireSession();
  const raw = Object.fromEntries(formData);
  const input = accountInputSchema.safeParse(raw);
  if (!input.success) return { status: "error", message: "Revisa los campos marcados.", fields: input.error.flatten().fieldErrors };
  const editing = raw.mode === "edit";
  if (raw.mode !== "create" && !editing) return conflict;
  const revision = accountRevisionSchema.safeParse(raw);
  if (editing && !revision.success) return conflict;
  const identity = { userId: session.user.id, sessionId: session.session.id };
  try {
    const sql = getSqlClient();
    if (editing && revision.success) {
      // After acquiring the same lock used by transaction writes, take a fresh snapshot
      // before deciding whether currency/opening balance can still be changed.
      const rows = await sql.transaction([lockAccountQuery(sql, identity, input.data.id), updateAccountQuery(sql, identity, input.data, revision.data.revision)], { isolationLevel: "ReadCommitted" });
      if (!rows[1].length) return conflict;
    } else {
      const rows = await sql.transaction(createAccountQueries(sql, identity, input.data), { isolationLevel: "ReadCommitted" });
      if (!rows[1].length) return conflict;
    }
  } catch {
    console.error("[accounts] No se pudo guardar la cuenta.");
    return unavailable;
  }
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { status: "success", message: editing ? "Cambios guardados." : "Cuenta creada correctamente." };
}

export async function changeAccountStatusAction(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const session = await requireSession();
  const input = accountStatusSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return conflict;
  try {
    const { id, revision, status } = input.data;
    const rows = await accountStatusQuery(getSqlClient(), { userId: session.user.id, sessionId: session.session.id }, id, revision, status);
    if (!rows.length) return conflict;
  } catch {
    console.error("[accounts] No se pudo cambiar el estado de la cuenta.");
    return unavailable;
  }
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { status: "success", message: input.data.status === "active" ? "Cuenta reactivada." : "Cuenta archivada. Su historial se conserva." };
}
