"use client";

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
    <nav aria-label="Ubicación" className="category-breadcrumb"><Link href="/settings">Ajustes</Link><span aria-hidden="true">/</span><span aria-current="page">Categorías</span></nav>
    <header className="accounts-heading"><div><h1>Categorías</h1><p>Dale sentido a cada ingreso y cada gasto.</p></div><button type="button" className="button button-primary new-account gap-2" aria-label="Nueva categoría" onClick={create}><Icon name="plus" /><span>Nueva categoría</span></button></header>
    {notice && <div className="account-success mt-5 flex items-center justify-between gap-3" role="status"><span>{notice}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => setNotice("")}><Icon name="close" /></button></div>}
    <section className="category-overview" aria-label="Resumen de categorías">
      <div><p className="text-xs text-[var(--muted)]">Gastos activos</p><p className="mt-2 text-2xl font-bold">{active.filter((category) => category.categoryType === "expense").length}</p></div>
      <div><p className="text-xs text-[var(--muted)]">Ingresos activos</p><p className="mt-2 text-2xl font-bold">{active.filter((category) => category.categoryType === "income").length}</p></div>
      <div><p className="text-xs text-[var(--muted)]">Creadas por ti</p><p className="mt-2 text-2xl font-bold">{categories.filter((category) => !category.isDefault).length}</p></div>
    </section>
    <section className="category-workspace" aria-label="Tus categorías">
      <div className="category-types" aria-label="Tipo de categorías">{(["expense", "income"] as const).map((value) => <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)}><Icon name={value === "expense" ? "expense" : "income"} />{value === "expense" ? "Gastos" : "Ingresos"}</button>)}</div>
      <div className="category-toolbar"><label className="min-w-0"><span className="sr-only">Buscar categorías</span><input type="search" className="auth-input" placeholder="Buscar una categoría" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label><span className="sr-only">Estado</span><select className="auth-input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Activas</option><option value="inactive">Inactivas</option><option value="all">Todos los estados</option></select></label><label><span className="sr-only">Origen</span><select className="auth-input" value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="all">Todos los orígenes</option><option value="default">Predeterminadas</option><option value="custom">Personalizadas</option></select></label></div>
      {filtered.length ? <div className="categories-grid">{filtered.map((category) => <article key={category.id} className="category-card" aria-label={category.name}>
        <div className="flex items-start gap-3"><span className="category-symbol" style={{ backgroundColor: `${getCategoryColor(category.color)}22` }}><CategoryIcon name={category.icon} /></span><div className="min-w-0"><h2 className="break-words text-base font-bold leading-6">{category.name}</h2><p className="mt-1 text-xs text-[var(--muted)]">{CATEGORY_TYPES[category.categoryType]}</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2"><span className="category-badge">{category.isDefault ? "Predeterminada" : "Personalizada"}</span>{!category.isActive && <span className="category-badge category-badge-inactive">Inactiva</span>}</div>
        <div className="category-card-actions"><button className="category-text-button" aria-label={`Editar ${category.name}`} onClick={() => { setNotice(""); setPanel({ kind: "edit", category }); }}><Icon name="edit" />Editar</button><button className="category-text-button" aria-label={`${category.isActive ? "Desactivar" : "Reactivar"} ${category.name}`} onClick={() => { setNotice(""); setPanel({ kind: "status", category }); }}><Icon name={category.isActive ? "archive" : "plus"} />{category.isActive ? "Desactivar" : "Reactivar"}</button></div>
      </article>)}</div> : <div className="accounts-empty"><span className="empty-wallet"><Icon name="categories" /></span><h2 className="mt-5 text-xl font-bold">No hay categorías para mostrar</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Prueba otros filtros o crea una categoría para {type === "expense" ? "tus gastos" : "tus ingresos"}.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" className="button button-secondary" onClick={reset}>Limpiar filtros</button><button type="button" className="button button-primary" onClick={create}>Crear categoría</button></div></div>}
      <p role="status" className="mt-4 text-xs text-[var(--muted)]">{filtered.length} {filtered.length === 1 ? "categoría mostrada" : "categorías mostradas"}</p>
    </section>
    <p className="mt-6 max-w-2xl text-xs leading-5 text-[var(--muted)]">Las predeterminadas vienen incluidas en PagaTo y puedes personalizarlas. Desactivar una categoría no borra sus movimientos ni sus presupuestos. Solo tú ves tus categorías.</p>
    {panel?.kind === "create" && <CategoryEditor id={panel.id} defaultType={type} onClose={() => setPanel(null)} onSaved={savedEditor} />}
    {panel?.kind === "edit" && <CategoryEditor id={panel.category.id} category={panel.category} defaultType={type} onClose={() => setPanel(null)} onSaved={savedEditor} />}
    {panel?.kind === "status" && <CategoryStatusDialog category={panel.category} onClose={() => setPanel(null)} onSaved={saved} />}
  </>;
}
