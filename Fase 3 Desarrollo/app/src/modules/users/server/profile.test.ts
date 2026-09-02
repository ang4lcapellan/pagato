// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { neon } from "@neondatabase/serverless";

vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getSqlClient: vi.fn() }));

import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { ensureFinancialProfile } from "./profile-repository";
import { getFinancialProfile } from "./profile-service";

const identity = { userId: "3b06e3af-9412-4c65-9246-62e95212cd5f", sessionId: "d9f02577-1577-4e6b-b8b7-213ad3de7211" };
const row = {
  id: "f067e4ab-0464-4a8e-854f-2bd6cbf63fcb", display_name: "Ana", email: "ana@example.invalid", status: "active",
  theme: "dark", locale: "en", base_currency: "USD", timezone: "America/Santo_Domingo", date_format: "DD/MM/YYYY",
  income_categories: 2, expense_categories: 8,
};

function databaseStub(rows: Record<string, unknown>[] = [row]) {
  const sql = neon("postgresql://test:test@localhost/test");
  const transaction = vi.spyOn(sql, "transaction").mockResolvedValue([[], [], [], rows]);
  return { sql, transaction };
}

beforeEach(() => vi.clearAllMocks());

describe("financial profile repository", () => {
  it("devuelve los datos persistidos y ejecuta un único lote atómico sin caché", async () => {
    const { sql, transaction } = databaseStub();
    const result = await ensureFinancialProfile(sql, identity);
    expect(result).toMatchObject({ status: "ready", profile: { id: row.id, preferences: { theme: "dark", baseCurrency: "USD" }, defaultCategories: { income: 2, expense: 8 } } });
    expect(transaction).toHaveBeenCalledOnce();
    expect(transaction.mock.calls[0][0]).toHaveLength(4);
    expect(transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: "ReadCommitted", fetchOptions: { cache: "no-store" } });
    expect(JSON.stringify(result)).not.toContain(identity.sessionId);
  });

  it("rechaza una sesión que ya no existe o no pertenece al usuario", async () => {
    const { sql } = databaseStub([]);
    expect(await ensureFinancialProfile(sql, identity)).toEqual({ status: "invalid-session" });
  });

  it.each(["suspended", "deleted"])("no devuelve datos financieros de un perfil %s", async (status) => {
    const { sql } = databaseStub([{ ...row, status }]);
    expect(await ensureFinancialProfile(sql, identity)).toEqual({ status: "inactive" });
  });

  it("no presenta éxito si faltan preferencias o falla la transacción", async () => {
    const { sql, transaction } = databaseStub([{ ...row, theme: null }]);
    await expect(ensureFinancialProfile(sql, identity)).rejects.toThrow();
    transaction.mockRejectedValue(new Error("database unavailable"));
    await expect(ensureFinancialProfile(sql, identity)).rejects.toThrow("database unavailable");
  });
});

describe("financial profile service", () => {
  it("no consulta la base de datos sin una sesión válida", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("redirect sign-in"));
    await expect(getFinancialProfile()).rejects.toThrow("redirect sign-in");
    expect(getSqlClient).not.toHaveBeenCalled();
  });

  it("usa la identidad de la sesión del servidor", async () => {
    const { sql, transaction } = databaseStub();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: identity.userId }, session: { id: identity.sessionId } } as Awaited<ReturnType<typeof requireSession>>);
    vi.mocked(getSqlClient).mockReturnValue(sql);
    expect(await getFinancialProfile()).toMatchObject({ status: "ready" });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("no filtra detalles sensibles cuando la base falla", async () => {
    const { sql, transaction } = databaseStub();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: identity.userId }, session: { id: identity.sessionId } } as Awaited<ReturnType<typeof requireSession>>);
    vi.mocked(getSqlClient).mockReturnValue(sql);
    transaction.mockRejectedValue(new Error("private credential"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getFinancialProfile()).toEqual({ status: "unavailable" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private credential");
    log.mockRestore();
  });
});
