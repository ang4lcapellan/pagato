"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { CATEGORY_TYPES, filterCategories, getCategoryColor, type Category, type CategoryType } from "../model";
import { CategoryEditor } from "./category-editor";
import { CategoryIcon } from "./category-icon";
import { CategoryStatusDialog } from "./category-status-dialog";

type Panel = { kind: "create"; id: string } | { kind: "edit" | "status"; category: Category } | null;

export function CategoriesScreen({ categories }: { categories: Category[] }) {
  const { t: tr, message: msg } = usePresentation();
  const router = useRouter();
  const [type, setType] = useState<CategoryType>("expense");
  const [status, setStatus] = useState("active");
  const [origin, setOrigin] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const saved = useCallback((message: string) => { setPanel(null); setNotice(message); router.refresh(); }, [router]);
  const savedEditor = useCallback((message: string, categoryType: CategoryType) => { setType(categoryType); setStatus("all"); setOrigin("all"); setSearch(""); saved(message); }, [saved]);
  const filtered = filterCategories(categories, { type, status, origin, search });
  const active = categories.filter((category) => category.isActive);
  const create = () => { setNotice(""); setPanel({ kind: "create", id: crypto.randomUUID() }); };
  const reset = () => { setStatus("all"); setOrigin("all"); setSearch(""); };

  return <>
    <nav aria-label={tr("Ubicación")} className="category-breadcrumb"><Link href="/settings">{tr("Ajustes")}</Link><span aria-hidden="true">/</span><span aria-current="page">{tr("Categorías")}</span></nav>
    <header className="accounts-heading"><div><h1>{tr("Categorías")}</h1><p>{tr("Dale sentido a cada ingreso y cada gasto.")}</p></div><button type="button" className="button button-primary new-account gap-2" aria-label={tr("Nueva categoría")} onClick={create}><Icon name="plus" /><span>{tr("Nueva categoría")}</span></button></header>
    {notice && <div className="account-success mt-5 flex items-center justify-between gap-3" role="status"><span>{tr(notice)}</span><button className="icon-button" aria-label={tr("Cerrar aviso")} onClick={() => setNotice("")}><Icon name="close" /></button></div>}
    <section className="category-overview" aria-label={tr("Resumen de categorías")}>
      <div><p className="text-xs text-[var(--muted)]">{tr("Gastos activos")}</p><p className="mt-2 text-2xl font-bold">{active.filter((category) => category.categoryType === "expense").length}</p></div>
      <div><p className="text-xs text-[var(--muted)]">{tr("Ingresos activos")}</p><p className="mt-2 text-2xl font-bold">{active.filter((category) => category.categoryType === "income").length}</p></div>
      <div><p className="text-xs text-[var(--muted)]">{tr("Creadas por ti")}</p><p className="mt-2 text-2xl font-bold">{categories.filter((category) => !category.isDefault).length}</p></div>
    </section>
    <section className="category-workspace" aria-label={tr("Tus categorías")}>
      <div className="category-types" aria-label={tr("Tipo de categorías")}>{(["expense", "income"] as const).map((value) => <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)}><Icon name={value === "expense" ? "expense" : "income"} />{value === "expense" ? tr("Gastos") : tr("Ingresos")}</button>)}</div>
      <div className="category-toolbar"><label className="min-w-0"><span className="sr-only">{tr("Buscar categorías")}</span><input type="search" className="auth-input" placeholder={tr("Buscar una categoría")} value={search} onChange={(event) => setSearch(event.target.value)} /></label><label><span className="sr-only">{tr("Estado")}</span><select className="auth-input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">{tr("Activas")}</option><option value="inactive">{tr("Inactivas")}</option><option value="all">{tr("Todos los estados")}</option></select></label><label><span className="sr-only">{tr("Origen")}</span><select className="auth-input" value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="all">{tr("Todos los orígenes")}</option><option value="default">{tr("Predeterminadas")}</option><option value="custom">{tr("Personalizadas")}</option></select></label></div>
      {filtered.length ? <div className="categories-grid">{filtered.map((category) => <article key={category.id} className="category-card" aria-label={category.name}>
        <div className="flex items-start gap-3"><span className="category-symbol" style={{ backgroundColor: `${getCategoryColor(category.color)}22` }}><CategoryIcon name={category.icon} /></span><div className="min-w-0"><h2 className="break-words text-base font-bold leading-6">{category.name}</h2><p className="mt-1 text-xs text-[var(--muted)]">{tr(CATEGORY_TYPES[category.categoryType])}</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2"><span className="category-badge">{category.isDefault ? tr("Predeterminada") : tr("Personalizada")}</span>{!category.isActive && <span className="category-badge category-badge-inactive">{tr("Inactiva")}</span>}</div>
        <div className="category-card-actions"><button className="category-text-button" aria-label={msg`Editar ${category.name}`} onClick={() => { setNotice(""); setPanel({ kind: "edit", category }); }}><Icon name="edit" />{tr("Editar")}</button><button className="category-text-button" aria-label={`${category.isActive ? "Desactivar" : "Reactivar"} ${category.name}`} onClick={() => { setNotice(""); setPanel({ kind: "status", category }); }}><Icon name={category.isActive ? "archive" : "plus"} />{category.isActive ? tr("Desactivar") : tr("Reactivar")}</button></div>
      </article>)}</div> : <div className="accounts-empty"><span className="empty-wallet"><Icon name="categories" /></span><h2 className="mt-5 text-xl font-bold">{tr("No hay categorías para mostrar")}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{tr("Prueba otros filtros o crea una categoría para ")}{type === "expense" ? tr("tus gastos") : tr("tus ingresos")}.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" className="button button-secondary" onClick={reset}>{tr("Limpiar filtros")}</button><button type="button" className="button button-primary" onClick={create}>{tr("Crear categoría")}</button></div></div>}
      <p role="status" className="mt-4 text-xs text-[var(--muted)]">{filtered.length} {filtered.length === 1 ? tr("categoría mostrada") : tr("categorías mostradas")}</p>
    </section>
    <p className="mt-6 max-w-2xl text-xs leading-5 text-[var(--muted)]">{tr("Las predeterminadas vienen incluidas en PagaTo y puedes personalizarlas. Desactivar una categoría no borra sus movimientos ni sus presupuestos. Solo tú ves tus categorías.")}</p>
    {panel?.kind === "create" && <CategoryEditor id={panel.id} defaultType={type} onClose={() => setPanel(null)} onSaved={savedEditor} />}
    {panel?.kind === "edit" && <CategoryEditor id={panel.category.id} category={panel.category} defaultType={type} onClose={() => setPanel(null)} onSaved={savedEditor} />}
    {panel?.kind === "status" && <CategoryStatusDialog category={panel.category} onClose={() => setPanel(null)} onSaved={saved} />}
  </>;
}
