// @vitest-environment node
import { describe, expect, it } from "vitest";
import { categoryInputSchema, categoryStatusSchema, filterCategories, getCategoryColor, getCategoryIcon, type Category } from "./model";

const input = { id: "937d272b-4d63-4b4b-83aa-0de80d53e29d", name: "  Mascotas  ", categoryType: "expense", icon: "pet", color: "#16a085" };
describe("validación de categorías", () => {
  it("normaliza texto y color e ignora datos de propietario, origen y código enviados por el navegador", () => {
    expect(categoryInputSchema.parse({ ...input, user_id: "other", isDefault: true, code: "food" })).toEqual({ ...input, name: "Mascotas", color: "#16A085" });
  });
  it.each([{ name: "   " }, { name: "a".repeat(81) }, { categoryType: "transfer" }, { icon: "<script>" }, { color: "url(https://example.com)" }, { id: "invalid" }])("rechaza datos inválidos: %j", (change) => {
    expect(categoryInputSchema.safeParse({ ...input, ...change }).success).toBe(false);
  });
  it("acepta ingresos y revisiones con precisión de PostgreSQL", () => {
    expect(categoryInputSchema.safeParse({ ...input, categoryType: "income" }).success).toBe(true);
    expect(categoryStatusSchema.safeParse({ id: input.id, revision: "2026-09-02T12:00:00.123456Z", status: "inactive" }).success).toBe(true);
    expect(categoryStatusSchema.safeParse({ id: input.id, revision: "ayer", status: "delete" }).success).toBe(false);
  });
  it("resuelve iconos y colores desconocidos sin inyectar contenido", () => {
    expect(getCategoryIcon("__proto__")).toBe("ellipsis");
    expect(getCategoryIcon("utensils")).toBe("utensils");
    expect(getCategoryColor("red;background:url(x)")).toBe("#0B6B58");
    expect(getCategoryColor("#56ccf2")).toBe("#56CCF2");
  });
});

it("combina búsqueda, tipo, estado y origen sin mezclar ingresos con gastos", () => {
  const base = { id: input.id, icon: "pet", color: "#16A085", revision: "2026-09-02T12:00:00Z" };
  const rows: Category[] = [
    { ...base, name: "Mascotas", categoryType: "expense", isActive: true, isDefault: false },
    { ...base, id: "two", name: "Salario", categoryType: "income", isActive: true, isDefault: true },
    { ...base, id: "three", name: "Mascotas antiguas", categoryType: "expense", isActive: false, isDefault: false },
  ];
  expect(filterCategories(rows, { type: "expense", status: "active", origin: "custom", search: " MASCOTAS " }).map((row) => row.name)).toEqual(["Mascotas"]);
  expect(filterCategories(rows, { type: "expense", status: "inactive", origin: "all", search: "" }).map((row) => row.id)).toEqual(["three"]);
  expect(filterCategories(rows, { type: "income", status: "all", origin: "default", search: "" }).map((row) => row.id)).toEqual(["two"]);
});
