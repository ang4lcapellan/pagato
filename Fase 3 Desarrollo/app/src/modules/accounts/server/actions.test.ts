// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getSqlClient: vi.fn() }));
vi.mock("./repository", () => ({ createAccountQueries: vi.fn(), updateAccountQuery: vi.fn(), accountStatusQuery: vi.fn(), lockAccountQuery: vi.fn() }));
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { revalidatePath } from "next/cache";
import { accountStatusQuery, createAccountQueries, updateAccountQuery } from "./repository";
import { changeAccountStatusAction, saveAccountAction } from "./actions";
import { initialAccountState } from "../model";

function form(extra: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ id: "0955bc09-14f2-4341-99d7-7711bba0f168", name: "Cuenta de prueba", mode: "create", accountType: "bank", currency: "DOP", openingBalance: "500", creditLimit: "", institution: "", description: "", color: "#0B6B58", ...extra })) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSession).mockResolvedValue({ user: { id: "verified-user" }, session: { id: "verified-session" } } as Awaited<ReturnType<typeof requireSession>>);
});
describe("account actions", () => {
  it("no escribe sin sesión", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("redirect"));
    await expect(saveAccountAction(initialAccountState, form())).rejects.toThrow("redirect");
    await expect(changeAccountStatusAction(initialAccountState, form())).rejects.toThrow("redirect");
    expect(getSqlClient).not.toHaveBeenCalled();
  });
  it("valida entradas antes de consultar", async () => {
    expect(await saveAccountAction(initialAccountState, form({ name: "" }))).toMatchObject({ status: "error", fields: { name: expect.any(Array) } });
    expect(getSqlClient).not.toHaveBeenCalled();
  });
  it("usa la sesión del servidor e invalida la vista al guardar", async () => {
    const transaction = vi.fn().mockResolvedValue([[], [{ id: "created" }]]);
    vi.mocked(getSqlClient).mockReturnValue({ transaction } as unknown as ReturnType<typeof getSqlClient>);
    expect(await saveAccountAction(initialAccountState, form({ user_id: "attacker" }))).toMatchObject({ status: "success" });
    expect(vi.mocked(createAccountQueries).mock.calls[0][1]).toEqual({ userId: "verified-user", sessionId: "verified-session" });
    expect(revalidatePath).toHaveBeenCalledWith("/accounts");
  });
  it("no comunica éxito al editar una cuenta ajena o con una versión desactualizada", async () => {
    vi.mocked(getSqlClient).mockReturnValue({ transaction: vi.fn().mockResolvedValue([[], []]) } as unknown as ReturnType<typeof getSqlClient>);
    vi.mocked(updateAccountQuery).mockResolvedValue([]);
    expect(await saveAccountAction(initialAccountState, form({ mode: "edit", revision: "2026-09-02T10:00:00.123456Z" }))).toMatchObject({ status: "error" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("comprueba propietario y revisión también al archivar", async () => {
    vi.mocked(accountStatusQuery).mockResolvedValue([]);
    expect(await changeAccountStatusAction(initialAccountState, form({ status: "archived", revision: "2026-09-02T10:00:00.123456Z" }))).toMatchObject({ status: "error" });
    expect(vi.mocked(accountStatusQuery).mock.calls[0][1]).toEqual({ userId: "verified-user", sessionId: "verified-session" });
  });
});
