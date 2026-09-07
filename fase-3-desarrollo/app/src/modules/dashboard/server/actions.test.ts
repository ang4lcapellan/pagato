// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getSqlClient: vi.fn() }));
vi.mock("@/modules/accounts/server/repository", () => ({ listAccounts: vi.fn() }));
vi.mock("@/modules/categories/server/repository", () => ({ listCategories: vi.fn() }));
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { listAccounts } from "@/modules/accounts/server/repository";
import { listCategories } from "@/modules/categories/server/repository";
import { loadDashboardOptionsAction } from "./actions";
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireSession).mockResolvedValue({ user: { id: "verified" }, session: { id: "session" } } as Awaited<ReturnType<typeof requireSession>>);
  vi.mocked(listAccounts).mockResolvedValue([]); vi.mocked(listCategories).mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());
it("requires a real session before reading financial options", async () => {
  vi.mocked(requireSession).mockRejectedValue(new Error("redirect"));
  await expect(loadDashboardOptionsAction()).rejects.toThrow("redirect");
  expect(getSqlClient).not.toHaveBeenCalled();
});
it("passes only server-verified identity to both repositories", async () => {
  expect(await loadDashboardOptionsAction()).toEqual({ status: "ready", accounts: [], categories: [] });
  expect(listAccounts).toHaveBeenCalledWith(undefined, { userId: "verified", sessionId: "session" });
  expect(listCategories).toHaveBeenCalledWith(undefined, { userId: "verified", sessionId: "session" });
});
it("fails closed if either repository rejects the owner", async () => {
  vi.mocked(listAccounts).mockResolvedValue(null);
  expect(await loadDashboardOptionsAction()).toMatchObject({ status: "error" });
});
it("does not expose database errors or connection values", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(listCategories).mockRejectedValue(new Error("PRIVATE CONNECTION"));
  expect(JSON.stringify(await loadDashboardOptionsAction())).not.toContain("PRIVATE");
  expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE");
});
