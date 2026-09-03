import { z } from "zod";

export const CATEGORY_TYPES = { expense: "Gasto", income: "Ingreso" } as const;
export const CATEGORY_ICONS = {
  utensils: "Alimentación", bus: "Transporte", house: "Hogar", receipt: "Servicios",
  "heart-pulse": "Salud", "graduation-cap": "Educación", popcorn: "Ocio",
  "wallet-cards": "Dinero", "circle-plus": "Extra", ellipsis: "Otros",
  briefcase: "Trabajo", gift: "Regalos", shopping: "Compras", pet: "Mascotas",
} as const;
export const CATEGORY_COLORS = [
  { value: "#0B6B58", label: "Verde profundo" }, { value: "#16A085", label: "Verde menta" },
  { value: "#2F80ED", label: "Azul" }, { value: "#9B51E0", label: "Violeta" },
  { value: "#F2994A", label: "Naranja" }, { value: "#EB5757", label: "Coral" },
  { value: "#647773", label: "Gris" },
] as const;
export type CategoryType = keyof typeof CATEGORY_TYPES;
export type CategoryIconName = keyof typeof CATEGORY_ICONS;
export type Category = {
  id: string; name: string; categoryType: CategoryType; icon: string | null;
  color: string | null; isDefault: boolean; isActive: boolean; revision: string;
};

export const categoryInputSchema = z.object({
  id: z.uuid("Identificador no válido."),
  name: z.string().trim().min(1, "Escribe un nombre para la categoría.").max(80, "Máximo 80 caracteres."),
  categoryType: z.enum(["expense", "income"], { error: "Elige ingreso o gasto." }),
  icon: z.enum(Object.keys(CATEGORY_ICONS) as [CategoryIconName, ...CategoryIconName[]], { error: "Elige un icono de la lista." }),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elige un color válido.").transform((value) => value.toUpperCase()),
});
export const categoryRevisionSchema = z.object({ id: z.uuid(), revision: z.iso.datetime({ offset: true }) });
export const categoryStatusSchema = categoryRevisionSchema.extend({ status: z.enum(["active", "inactive"]) });
export type CategoryInput = z.output<typeof categoryInputSchema>;
export type CategoryActionState = { status: "idle" | "success" | "error"; message?: string; fields?: Record<string, string[]> };
export const initialCategoryState: CategoryActionState = { status: "idle" };

export function getCategoryIcon(value: string | null): CategoryIconName {
  return value && Object.hasOwn(CATEGORY_ICONS, value) ? value as CategoryIconName : "ellipsis";
}
export function getCategoryColor(value: string | null): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : "#0B6B58";
}
export function filterCategories(categories: Category[], filters: { type: CategoryType; status: string; origin: string; search: string }) {
  const query = filters.search.trim().toLocaleLowerCase("es");
  return categories.filter((category) => category.categoryType === filters.type
    && (filters.status === "all" || category.isActive === (filters.status === "active"))
    && (filters.origin === "all" || category.isDefault === (filters.origin === "default"))
    && category.name.toLocaleLowerCase("es").includes(query));
}
