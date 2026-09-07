// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getSqlClient: vi.fn() }));
vi.mock("./repository", () => ({ createBudgetQueries: vi.fn(), updateBudgetQueries: vi.fn(), budgetStatusQueries: vi.fn() }));
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { revalidatePath } from "next/cache";
import { createBudgetQueries, updateBudgetQueries, budgetStatusQueries } from "./repository";
import { saveBudgetAction, changeBudgetStatusAction } from "./actions";
import { initialBudgetState } from "../model";
const id = "ae4c895a-1d84-4ed2-bd80-5b893d0fd12a";
function form(extra: Record<string, string> = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ id, mode: "create", name: "Alimentos", categoryId: id, currency: "DOP", amount: "12.34", periodStart: "2026-09-01", periodEnd: "2026-09-30", ...extra })) f.set(k, v);
  return f;
}
const transaction = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireSession).mockResolvedValue({ user: { id: "verified-user" }, session: { id: "verified-session" } } as Awaited<ReturnType<typeof requireSession>>);
  vi.mocked(getSqlClient).mockReturnValue({ transaction } as unknown as ReturnType<typeof getSqlClient>);
  transaction.mockResolvedValue([[], [{ id }]]);
  vi.mocked(createBudgetQueries).mockReturnValue([]);
  vi.mocked(updateBudgetQueries).mockReturnValue([]);
  vi.mocked(budgetStatusQueries).mockReturnValue([]);
});
it("requires verified authentication for every mutation", async () => {
  vi.mocked(requireSession).mockRejectedValue(new Error("redirect"));
  await expect(saveBudgetAction(initialBudgetState, form())).rejects.toThrow("redirect");
  await expect(changeBudgetStatusAction(initialBudgetState, form())).rejects.toThrow("redirect");
  expect(getSqlClient).not.toHaveBeenCalled();
});
it("validates money, dates and revisions before querying", async () => {
  expect(await saveBudgetAction(initialBudgetState, form({ amount: "0" }))).toMatchObject({ status: "error", fields: { amount: expect.any(Array) } });
  expect(await saveBudgetAction(initialBudgetState, form({ periodEnd: "2020-01-01" }))).toMatchObject({ status: "error", fields: { periodEnd: expect.any(Array) } });
  expect(await saveBudgetAction(initialBudgetState, form({ mode: "edit" }))).toMatchObject({ status: "error" });
  expect(getSqlClient).not.toHaveBeenCalled();
});
it("ignores client ownership and uses the verified identity in an atomic batch", async () => {
  expect(await saveBudgetAction(initialBudgetState, form({ user_id: "forged" }))).toMatchObject({ status: "success" });
  expect(vi.mocked(createBudgetQueries).mock.calls[0][1]).toEqual({ userId: "verified-user", sessionId: "verified-session" });
  expect(vi.mocked(createBudgetQueries).mock.calls[0][2]).not.toHaveProperty("user_id");
  expect(transaction).toHaveBeenCalledWith(expect.anything(), { isolationLevel: "ReadCommitted" });
  expect(revalidatePath).toHaveBeenCalledWith("/budgets");
});
it("rejects stale/foreign/overlapping writes", async () => {
  transaction.mockResolvedValue([[], []]);
  expect(await saveBudgetAction(initialBudgetState, form({ mode: "edit", revision: "2026-09-01T00:00:00Z" }))).toMatchObject({ status: "error" });
  expect(vi.mocked(updateBudgetQueries).mock.calls[0][3]).toBe("2026-09-01T00:00:00Z");
  expect(revalidatePath).not.toHaveBeenCalled();
});
it("archives and reactivates through identity-scoped queries", async () => {
  for (const status of ["active", "archived"]) {
    expect(await changeBudgetStatusAction(initialBudgetState, form({ status, revision: "2026-09-01T00:00:00Z" }))).toMatchObject({ status: "success" });
    expect(budgetStatusQueries).toHaveBeenLastCalledWith(expect.anything(), { userId: "verified-user", sessionId: "verified-session" }, id, "2026-09-01T00:00:00Z", status);
  }
});
it("does not report success on failed archive or reactivate", async () => {
  transaction.mockResolvedValue([[], []]);
  expect(await changeBudgetStatusAction(initialBudgetState, form({ status: "archived", revision: "2026-09-01T00:00:00Z" }))).toMatchObject({ status: "error" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
it("keeps database and connection errors private", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  transaction.mockRejectedValue({ code: "08006", message: "PRIVATE CONNECTION" });
  const result = await saveBudgetAction(initialBudgetState, form());
  expect(result.status).toBe("error");
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
  expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE");
  log.mockRestore();
});
