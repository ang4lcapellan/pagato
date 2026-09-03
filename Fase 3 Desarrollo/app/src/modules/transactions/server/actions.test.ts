// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getSqlClient: vi.fn() }));
vi.mock("./repository", () => ({ createTransactionQueries: vi.fn(), updateTransactionQueries: vi.fn(), deleteTransactionQuery: vi.fn(), lockLedgerQuery: vi.fn(), checkBalancesQuery: vi.fn() }));
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { revalidatePath } from "next/cache";
import { createTransactionQueries, updateTransactionQueries, deleteTransactionQuery } from "./repository";
import { saveTransactionAction, deleteTransactionAction } from "./actions";
import { initialTransactionState } from "../model";
const id = "968d739b-f164-4e70-bd12-c92e4b62f59a";
function form(extra: Record<string, string> = {}) {
  const result = new FormData();
  for (const [k, v] of Object.entries({ id, mode: "create", type: "expense", sourceAccountId: id, sourceCurrency: "DOP", categoryId: id, amount: "12.34", occurredLocal: "2026-09-02T12:30", ...extra })) result.set(k, v);
  return result;
}
const transaction = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireSession).mockResolvedValue({ user: { id: "verified-user" }, session: { id: "verified-session" } } as Awaited<ReturnType<typeof requireSession>>);
  vi.mocked(getSqlClient).mockReturnValue({ transaction } as unknown as ReturnType<typeof getSqlClient>);
  transaction.mockResolvedValue([[], [{ id }], []]);
  vi.mocked(createTransactionQueries).mockReturnValue([]);
  vi.mocked(updateTransactionQueries).mockReturnValue([]);
});
it("requires server authentication for create/edit/delete", async () => {
  vi.mocked(requireSession).mockRejectedValue(new Error("redirect"));
  await expect(saveTransactionAction(initialTransactionState, form())).rejects.toThrow("redirect");
  await expect(deleteTransactionAction(initialTransactionState, form({ version: "1" }))).rejects.toThrow("redirect");
  expect(getSqlClient).not.toHaveBeenCalled();
});
it("validates amounts and versions before SQL", async () => {
  expect(await saveTransactionAction(initialTransactionState, form({ amount: "-3" }))).toMatchObject({ status: "error", fields: { amount: expect.any(Array) } });
  expect(await saveTransactionAction(initialTransactionState, form({ mode: "edit", version: "0" }))).toMatchObject({ status: "error" });
  expect(getSqlClient).not.toHaveBeenCalled();
});
it("derives ownership from session, uses atomic batch and refreshes balances", async () => {
  expect(await saveTransactionAction(initialTransactionState, form({ user_id: "forged" }))).toMatchObject({ status: "success" });
  expect(vi.mocked(createTransactionQueries).mock.calls[0][1]).toEqual({ userId: "verified-user", sessionId: "verified-session" });
  expect(vi.mocked(createTransactionQueries).mock.calls[0][2]).not.toHaveProperty("user_id");
  expect(transaction).toHaveBeenCalledWith(expect.anything(), { isolationLevel: "ReadCommitted" });
  for (const path of ["/transactions", "/accounts", "/dashboard", "/budgets"]) expect(revalidatePath).toHaveBeenCalledWith(path);
});
it("rejects stale/missing/foreign mutations without reporting success", async () => {
  transaction.mockResolvedValue([[], [], []]);
  expect(await saveTransactionAction(initialTransactionState, form({ mode: "edit", version: "3" }))).toMatchObject({ status: "error" });
  expect(vi.mocked(updateTransactionQueries).mock.calls[0][3]).toBe(3);
  expect(revalidatePath).not.toHaveBeenCalled();
});
it("keeps SQL and connection errors private", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  transaction.mockRejectedValue({ code: "08006", message: "PRIVATE CONNECTION" });
  const result = await saveTransactionAction(initialTransactionState, form());
  expect(result.status).toBe("error");
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
  expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE");
  log.mockRestore();
});
it("soft delete verifies identity and version and refreshes balances", async () => {
  vi.mocked(deleteTransactionQuery).mockResolvedValue([{ id }]);
  expect(await deleteTransactionAction(initialTransactionState, form({ version: "4" }))).toMatchObject({ status: "success" });
  expect(deleteTransactionQuery).toHaveBeenCalledWith(expect.anything(), { userId: "verified-user", sessionId: "verified-session" }, id, 4);
  expect(revalidatePath).toHaveBeenCalledWith("/accounts");
});
it("cannot delete an already removed or stale record", async () => {
  transaction.mockResolvedValue([[], [], []]);
  vi.mocked(deleteTransactionQuery).mockResolvedValue([]);
  expect(await deleteTransactionAction(initialTransactionState, form({ version: "1" }))).toMatchObject({ status: "error" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
it("explains numeric overflow without reporting a committed movement", async () => {
  transaction.mockRejectedValue({ code: "22003", detail: "PRIVATE" });
  const result = await saveTransactionAction(initialTransactionState, form());
  expect(result).toMatchObject({ status: "error", message: expect.stringContaining("saldo máximo") });
  expect(revalidatePath).not.toHaveBeenCalled();
});
