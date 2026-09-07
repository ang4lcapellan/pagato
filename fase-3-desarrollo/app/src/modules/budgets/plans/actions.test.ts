// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getSqlClient: vi.fn() }));
vi.mock("./repository", () => ({ savePlanQueries: vi.fn(), getPlan: vi.fn(), planStatusQueries: vi.fn() }));
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { revalidatePath } from "next/cache";
import { getPlan, savePlanQueries } from "./repository";
import { savePlanAction, copyPlanAction, changePlanStatusAction } from "./actions";
import { initialPlanState, type PlanDetail } from "./model";
const id = "cd797829-be39-4138-a7ca-02c07bb53147", requestId = "c28892fe-13ce-4f87-857e-f68b14b100a3";
const transaction = vi.fn();
function form(extra: Record<string, string> = {}) { const data = new FormData(); for (const [k, v] of Object.entries({ id, requestId, name: "Mes", mode: "create", month: "2026-09", currency: "DOP", amount: "1000", allocations: "[]", ...extra })) data.set(k, v); return data; }
beforeEach(() => {
  vi.resetAllMocks(); vi.mocked(requireSession).mockResolvedValue({ user: { id: "server-user" }, session: { id: "server-session" } } as Awaited<ReturnType<typeof requireSession>>);
  vi.mocked(getSqlClient).mockReturnValue({ transaction } as unknown as ReturnType<typeof getSqlClient>); vi.mocked(savePlanQueries).mockReturnValue([]); transaction.mockResolvedValue([[], [{ id, version: 1 }]]);
});
it("requires authentication for creation, copy and status", async () => {
  vi.mocked(requireSession).mockRejectedValue(new Error("redirect"));
  for (const action of [savePlanAction, copyPlanAction, changePlanStatusAction]) await expect(action(initialPlanState, form())).rejects.toThrow("redirect");
  expect(getSqlClient).not.toHaveBeenCalled();
});
it("validates JSON and total allocation before SQL", async () => {
  for (const allocations of ["invalid", "null", JSON.stringify([{ categoryId: id, amount: "1001" }])]) expect(await savePlanAction(initialPlanState, form({ allocations }))).toMatchObject({ status: "error" });
  expect(getSqlClient).not.toHaveBeenCalled();
});
it("derives ownership from the session and invalidates child routes", async () => {
  expect(await savePlanAction(initialPlanState, form({ user_id: "forged" }))).toMatchObject({ status: "success", id, version: 1 });
  expect(vi.mocked(savePlanQueries).mock.calls[0][1]).toEqual({ userId: "server-user", sessionId: "server-session" });
  expect(vi.mocked(savePlanQueries).mock.calls[0][2]).not.toHaveProperty("user_id");
  expect(revalidatePath).toHaveBeenCalledWith("/budgets", "layout");
});
it("copies the server configuration, not client amounts or historical spending", async () => {
  vi.mocked(getPlan).mockResolvedValue({ plan: { version: 3, currency: "USD", amount: "500", expectedIncome: "700" }, budgets: [{ categoryId: id, amount: "200", spent: "150", categoryActive: true }] } as PlanDetail);
  expect(await copyPlanAction(initialPlanState, form({ sourceId: id, sourceVersion: "3", month: "2026-10", amount: "999999" }))).toMatchObject({ status: "success" });
  const input = vi.mocked(savePlanQueries).mock.calls[0][2];
  expect(input).toMatchObject({ currency: "USD", amount: "500", expectedIncome: "700", month: "2026-10", allocations: [{ categoryId: id, amount: "200" }] });
  expect(input.allocations[0]).not.toHaveProperty("spent");
  expect(vi.mocked(savePlanQueries).mock.calls[0][3]).toEqual({ id, version: 3 });
});
it("does not silently omit inactive categories when copying", async () => {
  vi.mocked(getPlan).mockResolvedValue({ plan: { version: 3 }, budgets: [{ categoryActive: false }] } as PlanDetail);
  expect(await copyPlanAction(initialPlanState, form({ sourceId: id, sourceVersion: "3" }))).toMatchObject({ status: "error", message: expect.stringContaining("inactivas") });
  expect(savePlanQueries).not.toHaveBeenCalled();
});
it("rejects inaccessible or stale copy sources", async () => {
  vi.mocked(getPlan).mockResolvedValue(null);
  expect(await copyPlanAction(initialPlanState, form({ sourceId: id, sourceVersion: "3" }))).toMatchObject({ status: "error" });
  vi.mocked(getPlan).mockResolvedValue({ plan: { version: 4 }, budgets: [] } as unknown as PlanDetail);
  expect(await copyPlanAction(initialPlanState, form({ sourceId: id, sourceVersion: "3" }))).toMatchObject({ status: "error" });
  expect(savePlanQueries).not.toHaveBeenCalled();
});
it("returns conflicts and hides SQL errors", async () => {
  transaction.mockResolvedValue([[], []]); expect(await savePlanAction(initialPlanState, form())).toMatchObject({ status: "error" });
  transaction.mockRejectedValue({ code: "23505", message: "PRIVATE" }); expect(JSON.stringify(await savePlanAction(initialPlanState, form()))).not.toContain("PRIVATE");
  expect(revalidatePath).not.toHaveBeenCalled();
});
