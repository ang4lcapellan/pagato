"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { transactionInputSchema, transactionVersionSchema, type TransactionActionState } from "../model";
import { createTransactionQueries, updateTransactionQueries, deleteTransactionQuery, lockLedgerQuery, checkBalancesQuery } from "./repository";

const conflict: TransactionActionState = { status: "error", message: "No se guardó el movimiento. Puede haber cambiado; verifica que las cuentas y la categoría estén activas y sean compatibles. En la misma moneda, el importe enviado y recibido debe coincidir. Actualiza la página antes de reintentar." };
const unavailable: TransactionActionState = { status: "error", message: "No pudimos confirmar el guardado. Revisa la conexión y reintenta sin cerrar el formulario; no duplicaremos la misma solicitud." };
function refresh() { for (const path of ["/transactions", "/accounts", "/dashboard", "/budgets"]) revalidatePath(path); revalidatePath("/budgets", "layout"); }
export async function saveTransactionAction(_state: TransactionActionState, form: FormData): Promise<TransactionActionState> {
  const session = await requireSession();
  const raw = Object.fromEntries(form);
  const parsed = transactionInputSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", message: "Revisa los campos marcados.", fields: parsed.error.flatten().fieldErrors };
  const version = transactionVersionSchema.safeParse(raw);
  if ((raw.mode !== "create" && raw.mode !== "edit") || (raw.mode === "edit" && !version.success)) return conflict;
  const identity = { userId: session.user.id, sessionId: session.session.id };
  try {
    const sql = getSqlClient();
    const queries = raw.mode === "edit" && version.success ? updateTransactionQueries(sql, identity, parsed.data, version.data.version) : createTransactionQueries(sql, identity, parsed.data);
    const result = await sql.transaction([...queries, checkBalancesQuery(sql, identity)], { isolationLevel: "ReadCommitted" });
    if (!result.at(-2)?.length) return conflict;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "22003") return { status: "error", message: "El movimiento excedería el saldo máximo admitido por una cuenta. Reduce el importe." };
    if (typeof error === "object" && error && "code" in error && ["23503", "23505", "23514", "40001", "40P01"].includes(String(error.code))) return conflict;
    console.error("[transactions] No se pudo confirmar el guardado.");
    return unavailable;
  }
  refresh();
  return { status: "success", message: raw.mode === "edit" ? "Transacción actualizada. Los saldos están al día." : "Transacción registrada. Los saldos están al día." };
}
export async function deleteTransactionAction(_state: TransactionActionState, form: FormData): Promise<TransactionActionState> {
  const session = await requireSession();
  const parsed = transactionVersionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return conflict;
  try {
    const sql = getSqlClient();
    const identity = { userId: session.user.id, sessionId: session.session.id };
    const result = await sql.transaction([lockLedgerQuery(sql, identity), deleteTransactionQuery(sql, identity, parsed.data.id, parsed.data.version), checkBalancesQuery(sql, identity)], { isolationLevel: "ReadCommitted" });
    if (!result[1].length) return { status: "error", message: "El movimiento cambió o ya fue eliminado. Actualiza la página para comprobarlo." };
  } catch {
    return { status: "error", message: "No pudimos confirmar la eliminación. Actualiza el historial para comprobar el estado antes de reintentar." };
  }
  refresh();
  return { status: "success", message: "Transacción eliminada del historial. Su efecto en los saldos se ha revertido." };
}
