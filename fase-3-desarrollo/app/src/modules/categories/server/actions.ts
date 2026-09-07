"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { categoryInputSchema, categoryRevisionSchema, categoryStatusSchema, type CategoryActionState } from "../model";
import { categoryStatusQuery, createCategoryQueries, updateCategoryQuery } from "./repository";

const conflict: CategoryActionState = { status: "error", message: "La categoría cambió o ya no está disponible. Cierra este formulario y actualiza la página. El tipo no puede cambiarse." };
const unavailable: CategoryActionState = { status: "error", message: "No pudimos guardar los cambios. Comprueba tu conexión e inténtalo de nuevo." };

function refreshCategories() {
  revalidatePath("/categories");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/budgets", "layout");
}

export async function saveCategoryAction(_state: CategoryActionState, data: FormData): Promise<CategoryActionState> {
  const session = await requireSession();
  const raw = Object.fromEntries(data);
  const input = categoryInputSchema.safeParse(raw);
  if (!input.success) return { status: "error", message: "Revisa los campos marcados.", fields: input.error.flatten().fieldErrors };
  if (raw.mode !== "create" && raw.mode !== "edit") return conflict;
  const revision = categoryRevisionSchema.safeParse(raw);
  if (raw.mode === "edit" && !revision.success) return conflict;
  const identity = { userId: session.user.id, sessionId: session.session.id };
  try {
    const sql = getSqlClient();
    if (raw.mode === "edit" && revision.success) {
      if (!(await updateCategoryQuery(sql, identity, input.data, revision.data.revision)).length) return conflict;
    } else {
      const rows = await sql.transaction(createCategoryQueries(sql, identity, input.data), { isolationLevel: "ReadCommitted" });
      if (!rows[1].length) return conflict;
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { status: "error", message: "Ya tienes una categoría de ese tipo con ese nombre, incluso entre las inactivas.", fields: { name: ["Usa otro nombre o reactiva la categoría existente."] } };
    }
    console.error("[categories] No se pudo guardar la categoría.");
    return unavailable;
  }
  refreshCategories();
  return { status: "success", message: raw.mode === "edit" ? "Categoría actualizada." : "Categoría creada correctamente." };
}

export async function changeCategoryStatusAction(_state: CategoryActionState, data: FormData): Promise<CategoryActionState> {
  const session = await requireSession();
  const input = categoryStatusSchema.safeParse(Object.fromEntries(data));
  if (!input.success) return conflict;
  try {
    const { id, revision, status } = input.data;
    const rows = await categoryStatusQuery(getSqlClient(), { userId: session.user.id, sessionId: session.session.id }, id, revision, status);
    if (!rows.length) return conflict;
  } catch {
    console.error("[categories] No se pudo cambiar el estado.");
    return unavailable;
  }
  refreshCategories();
  return { status: "success", message: input.data.status === "active" ? "Categoría reactivada." : "Categoría desactivada. Su historial se conserva." };
}
