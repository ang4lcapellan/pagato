// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getSqlClient: vi.fn() }));
vi.mock("./repository", () => ({ createCategoryQueries: vi.fn(), updateCategoryQuery: vi.fn(), categoryStatusQuery: vi.fn() }));
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { revalidatePath } from "next/cache";
import { categoryStatusQuery, createCategoryQueries, updateCategoryQuery } from "./repository";
import { changeCategoryStatusAction, saveCategoryAction } from "./actions";
import { initialCategoryState } from "../model";

function form(change: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ id: "937d272b-4d63-4b4b-83aa-0de80d53e29d", name: "Mascotas", mode: "create", categoryType: "expense", icon: "pet", color: "#16A085", ...change })) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireSession).mockResolvedValue({ user: { id: "verified-user" }, session: { id: "verified-session" } } as Awaited<ReturnType<typeof requireSession>>);
});
it("exige sesión en creación, edición y cambio de estado", async () => {
  vi.mocked(requireSession).mockRejectedValue(new Error("redirect"));
  await expect(saveCategoryAction(initialCategoryState, form())).rejects.toThrow("redirect");
  await expect(saveCategoryAction(initialCategoryState, form({ mode: "edit" }))).rejects.toThrow("redirect");
  await expect(changeCategoryStatusAction(initialCategoryState, form())).rejects.toThrow("redirect");
  expect(getSqlClient).not.toHaveBeenCalled();
});
it("valida antes de consultar la base", async () => {
  expect(await saveCategoryAction(initialCategoryState, form({ name: " " }))).toMatchObject({ status: "error", fields: { name: expect.any(Array) } });
  expect(await saveCategoryAction(initialCategoryState, form({ mode: "edit", revision: "invalid" }))).toMatchObject({ status: "error" });
  expect(getSqlClient).not.toHaveBeenCalled();
});
it("solo confía en la identidad del servidor y no permite crear predeterminadas desde el formulario", async () => {
  const transaction = vi.fn().mockResolvedValue([[], [{ id: "created" }]]);
  vi.mocked(getSqlClient).mockReturnValue({ transaction } as unknown as ReturnType<typeof getSqlClient>);
  expect(await saveCategoryAction(initialCategoryState, form({ user_id: "attacker", isDefault: "true", code: "food" }))).toMatchObject({ status: "success" });
  const call = vi.mocked(createCategoryQueries).mock.calls[0];
  expect(call[1]).toEqual({ userId: "verified-user", sessionId: "verified-session" });
  expect(call[2]).not.toHaveProperty("user_id");
  expect(call[2]).not.toHaveProperty("isDefault");
  expect(revalidatePath).toHaveBeenCalledWith("/categories");
});
it("explica nombres duplicados sin exponer errores SQL", async () => {
  const transaction = vi.fn().mockRejectedValue({ code: "23505", detail: "PRIVATE SQL DATA" });
  vi.mocked(getSqlClient).mockReturnValue({ transaction } as unknown as ReturnType<typeof getSqlClient>);
  const result = await saveCategoryAction(initialCategoryState, form());
  expect(result).toMatchObject({ status: "error", fields: { name: expect.any(Array) } });
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
  expect(revalidatePath).not.toHaveBeenCalled();
});
it("rechaza ediciones ajenas, obsoletas o con cambio de tipo", async () => {
  vi.mocked(updateCategoryQuery).mockResolvedValue([]);
  expect(await saveCategoryAction(initialCategoryState, form({ mode: "edit", revision: "2026-09-02T10:00:00.123456Z" }))).toMatchObject({ status: "error" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
it("verifica propietario y revisión al desactivar", async () => {
  vi.mocked(categoryStatusQuery).mockResolvedValue([]);
  expect(await changeCategoryStatusAction(initialCategoryState, form({ status: "inactive", revision: "2026-09-02T10:00:00Z" }))).toMatchObject({ status: "error" });
  expect(vi.mocked(categoryStatusQuery).mock.calls[0][1]).toEqual({ userId: "verified-user", sessionId: "verified-session" });
});
it("confirma reactivación y actualiza las pantallas", async () => {
  vi.mocked(categoryStatusQuery).mockResolvedValue([{ id: "saved" }]);
  expect(await changeCategoryStatusAction(initialCategoryState, form({ status: "active", revision: "2026-09-02T10:00:00Z" }))).toMatchObject({ status: "success", message: "Categoría reactivada." });
  expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
});
