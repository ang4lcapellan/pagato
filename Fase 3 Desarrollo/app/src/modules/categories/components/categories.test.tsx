import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ router: { refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ title, children }: { title: string; children: ReactNode }) => <section role="dialog" aria-label={title}>{children}</section> }));
vi.mock("../server/actions", () => ({ saveCategoryAction: vi.fn(), changeCategoryStatusAction: vi.fn() }));
import { saveCategoryAction } from "../server/actions";
import { CategoryEditor } from "./category-editor";
import { CategoriesScreen } from "./categories-screen";
import type { Category } from "../model";

const rows: Category[] = [
  { id: "937d272b-4d63-4b4b-83aa-0de80d53e29d", name: "Alimentación", categoryType: "expense", icon: "utensils", color: "#F2994A", isDefault: true, isActive: true, revision: "2026-09-02T10:00:00Z" },
  { id: "two", name: "Mascotas", categoryType: "expense", icon: "pet", color: "#16A085", isDefault: false, isActive: false, revision: "2026-09-02T10:00:00Z" },
  { id: "three", name: "Salario", categoryType: "income", icon: "wallet-cards", color: "#12A683", isDefault: true, isActive: true, revision: "2026-09-02T10:00:00Z" },
];
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("separa ingresos y gastos y filtra inactivas, origen y búsqueda", () => {
  render(<CategoriesScreen categories={rows} />);
  expect(screen.getByRole("article", { name: "Alimentación" })).toBeInTheDocument();
  expect(screen.queryByRole("article", { name: "Salario" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ingresos" }));
  expect(screen.getByRole("article", { name: "Salario" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Gastos" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Estado" }), { target: { value: "inactive" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Origen" }), { target: { value: "custom" } });
  expect(screen.getByRole("button", { name: "Reactivar Mascotas" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "sin coincidencia" } });
  expect(screen.getByText("No hay categorías para mostrar")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
});
it("solicita confirmación antes de desactivar", () => {
  render(<CategoriesScreen categories={rows} />);
  fireEvent.click(screen.getByRole("button", { name: "Desactivar Alimentación" }));
  expect(screen.getByRole("dialog", { name: "Desactivar categoría" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Confirmar desactivación" })).toBeInTheDocument();
});
it("conserva valores y enfoca el nombre al rechazar el formulario", async () => {
  vi.mocked(saveCategoryAction).mockResolvedValue({ status: "error", message: "Revisa los campos marcados.", fields: { name: ["Escribe un nombre."] } });
  render(<CategoryEditor id={rows[0].id} defaultType="expense" onClose={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByRole("combobox", { name: "Tipo de categoría" }), { target: { value: "income" } });
  fireEvent.click(screen.getByRole("radio", { name: "Trabajo" }));
  fireEvent.click(screen.getByRole("radio", { name: "Violeta" }));
  fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));
  await screen.findByRole("alert");
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Nombre de la categoría" })).toHaveFocus());
  expect(screen.getByRole("combobox", { name: "Tipo de categoría" })).toHaveValue("income");
  expect(screen.getByRole("radio", { name: "Trabajo" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Violeta" })).toBeChecked();
});
it("bloquea el tipo al editar y conserva los colores de las categorías iniciales", () => {
  render(<CategoryEditor id={rows[2].id} category={rows[2]} defaultType="expense" onClose={vi.fn()} onSaved={vi.fn()} />);
  expect(screen.getByRole("combobox", { name: "Tipo de categoría" })).toBeDisabled();
  expect(screen.getByRole("radio", { name: "Color actual" })).toBeChecked();
});
