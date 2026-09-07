"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { budgetInputSchema, budgetRevisionSchema, budgetStatusSchema, type BudgetActionState } from "../model";
import { createBudgetQueries, updateBudgetQueries, budgetStatusQueries } from "./repository";

const conflict: BudgetActionState = { status: "error", message: "No se guardó el cambio. Revisa que la categoría esté activa y no haya otro presupuesto activo para esa categoría y moneda con fechas que se solapen. Si el presupuesto cambió, cierra el formulario y actualiza la página." };
const unavailable: BudgetActionState = { status: "error", message: "No pudimos confirmar el guardado. Revisa tu conexión y reintenta sin cerrar el formulario; la misma solicitud no se duplicará." };
function refresh() { revalidatePath("/budgets"); revalidatePath("/dashboard"); }
export async function saveBudgetAction(_state: BudgetActionState, form: FormData): Promise<BudgetActionState> {
  const session = await requireSession();
  const raw = Object.fromEntries(form);
  const input = budgetInputSchema.safeParse(raw);
  if (!input.success) return { status: "error", message: "Revisa los campos marcados.", fields: input.error.flatten().fieldErrors };
  const revision = budgetRevisionSchema.safeParse(raw);
  if ((raw.mode !== "create" && raw.mode !== "edit") || (raw.mode === "edit" && !revision.success)) return conflict;
  const identity = { userId: session.user.id, sessionId: session.session.id };
  try {
    const sql = getSqlClient();
    const queries = raw.mode === "edit" && revision.success ? updateBudgetQueries(sql, identity, input.data, revision.data.revision) : createBudgetQueries(sql, identity, input.data);
    const result = await sql.transaction(queries, { isolationLevel: "ReadCommitted" });
    if (!result.at(-1)?.length) return conflict;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && ["23503", "23505", "23514", "40001", "40P01"].includes(String(error.code))) return conflict;
    console.error("[budgets] No se pudo confirmar el guardado.");
    return unavailable;
  }
  refresh();
  return { status: "success", message: raw.mode === "edit" ? "Presupuesto actualizado. El progreso se recalculó con tus gastos." : "Presupuesto creado. Ya incluye los gastos de ese período." };
}
export async function changeBudgetStatusAction(_state: BudgetActionState, form: FormData): Promise<BudgetActionState> {
  const session = await requireSession();
  const input = budgetStatusSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return conflict;
  try {
    const sql = getSqlClient();
    const { id, revision, status } = input.data;
    const result = await sql.transaction(budgetStatusQueries(sql, { userId: session.user.id, sessionId: session.session.id }, id, revision, status), { isolationLevel: "ReadCommitted" });
    if (!result.at(-1)?.length) return conflict;
  } catch { return unavailable; }
  refresh();
  return { status: "success", message: input.data.status === "archived" ? "Presupuesto archivado. Tus gastos no se modificaron." : "Presupuesto reactivado." };
}
