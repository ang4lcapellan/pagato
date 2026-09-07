"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { copyPlanSchema, planSchema, planStatusSchema, type PlanActionState, type PlanInput } from "./model";
import { getPlan, savePlanQueries, planStatusQueries } from "./repository";
const conflict: PlanActionState = { status: "error", message: "No se guardó. El presupuesto pudo cambiar o ya existe uno activo para ese mes y moneda. Comprueba las categorías activas y recarga antes de reintentar." };
const unavailable: PlanActionState = { status: "error", message: "No pudimos confirmar el guardado. Revisa tu conexión y reintenta sin cerrar el formulario." };
function refresh(id: string) { revalidatePath("/budgets", "layout"); revalidatePath(`/budgets/${id}`); revalidatePath("/dashboard"); }
function parseForm(form: FormData) {
  const raw = Object.fromEntries(form);
  const text = raw.allocations;
  let allocations: unknown = [];
  if (typeof text === "string" && text.length <= 20000) { try { allocations = JSON.parse(text); } catch { allocations = null; } }
  else if (text !== undefined) allocations = null;
  return planSchema.safeParse({ ...raw, allocations });
}
async function persist(identity: { userId: string; sessionId: string }, input: PlanInput, source?: { id: string; version: number }): Promise<PlanActionState> {
  try {
    const sql = getSqlClient();
    const rows = await sql.transaction(savePlanQueries(sql, identity, input, source), { isolationLevel: "ReadCommitted" });
    const saved = rows.at(-1)?.[0];
    if (!saved) return conflict;
    refresh(input.id);
    return { status: "success", id: input.id, version: Number(saved.version), message: source ? "Presupuesto copiado. No se copiaron movimientos." : "Presupuesto guardado." };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && ["23505", "23503", "23514", "40001", "40P01"].includes(String(error.code))) return conflict;
    console.error("[budget-plans] No se pudo confirmar la operación."); return unavailable;
  }
}
export async function savePlanAction(_state: PlanActionState, form: FormData): Promise<PlanActionState> {
  const session = await requireSession();
  const input = parseForm(form);
  if (!input.success) return { status: "error", message: "Revisa los datos y los límites de las categorías.", fields: input.error.flatten().fieldErrors };
  return persist({ userId: session.user.id, sessionId: session.session.id }, input.data);
}
export async function copyPlanAction(_state: PlanActionState, form: FormData): Promise<PlanActionState> {
  const session = await requireSession(); const parsed = copyPlanSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: "Revisa el nombre y el mes de destino." };
  const v = parsed.data, identity = { userId: session.user.id, sessionId: session.session.id };
  try {
    const detail = await getPlan(getSqlClient(), identity, v.sourceId);
    if (!detail || detail.plan.version !== v.sourceVersion) return conflict;
    if (detail.budgets.some(b => !b.categoryActive)) return { status: "error", message: "Hay categorías inactivas en el presupuesto original. Reactívalas o retíralas antes de copiar; no omitiremos categorías sin avisarte." };
    const input = planSchema.safeParse({ id: v.id, requestId: v.requestId, mode: "create", version: 0, name: v.name, month: v.month,
      currency: detail.plan.currency, amount: detail.plan.amount, expectedIncome: detail.plan.expectedIncome ?? "",
      allocations: detail.budgets.map(b => ({ categoryId: b.categoryId, amount: b.amount })) });
    if (!input.success) return conflict;
    return persist(identity, input.data, { id: v.sourceId, version: v.sourceVersion });
  } catch { return unavailable; }
}
export async function changePlanStatusAction(_state: PlanActionState, form: FormData): Promise<PlanActionState> {
  const session = await requireSession(); const parsed = planStatusSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return conflict;
  try {
    const sql = getSqlClient(), v = parsed.data;
    const rows = await sql.transaction(planStatusQueries(sql, { userId: session.user.id, sessionId: session.session.id }, v.id, v.version, v.status), { isolationLevel: "ReadCommitted" });
    if (!rows.at(-1)?.length) return conflict;
    refresh(v.id);
    return { status: "success", id: v.id, version: Number(rows.at(-1)![0].version), message: v.status === "archived" ? "Presupuesto archivado. Los movimientos no cambian." : "Presupuesto reactivado." };
  } catch { return conflict; }
}
