"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_TYPES, getCategoryColor, getCategoryIcon, initialCategoryState, type Category, type CategoryType } from "../model";
import { saveCategoryAction } from "../server/actions";
import { CategoryIcon } from "./category-icon";

export function CategoryEditor({ category, id, defaultType, onClose, onSaved }: {
  category?: Category; id: string; defaultType: CategoryType; onClose: () => void;
  onSaved: (message: string, type: CategoryType) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(saveCategoryAction, initialCategoryState);
  const [values, setValues] = useState({ name: category?.name ?? "", categoryType: category?.categoryType ?? defaultType, icon: getCategoryIcon(category?.icon ?? null), color: getCategoryColor(category?.color ?? null) });
  useEffect(() => { if (state.status === "success") onSaved(state.message ?? "Categoría guardada.", values.categoryType); }, [state, onSaved, values.categoryType]);
  useEffect(() => {
    if (state.status === "error") {
      const target = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.current?.querySelector<HTMLElement>('[role="alert"]');
      target?.focus();
    }
  }, [state]);
  const error = (field: string) => state.fields?.[field]?.[0];
  const attrs = (field: string) => ({ "aria-invalid": Boolean(error(field)), "aria-describedby": error(field) ? `category-${field}-error` : undefined });
  const message = (field: string) => error(field) ? <p className="field-error" id={`category-${field}-error`}>{error(field)}</p> : null;
  const colors = CATEGORY_COLORS.some((color) => color.value === values.color) ? CATEGORY_COLORS : [...CATEGORY_COLORS, { value: values.color, label: "Color actual" }];

  return <Modal title={category ? "Editar categoría" : "Nueva categoría"} onClose={onClose} busy={pending}>
    <p className="mb-5 text-sm leading-6 text-[var(--muted)]">{category?.isDefault ? "Esta categoría viene incluida en PagaTo. Puedes personalizarla para tu cuenta." : "Crea una forma sencilla de organizar tus ingresos o gastos."}</p>
    <form ref={form} noValidate className="space-y-5" onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const data = new FormData(event.currentTarget);
      // Keep controlled fields intact when validation rejects a submission.
      startTransition(() => action(data));
    }}>
      <input type="hidden" name="mode" value={category ? "edit" : "create"} />
      <input type="hidden" name="id" value={id} />
      {category && <input type="hidden" name="revision" value={category.revision} />}
      {state.status === "error" && <p className="account-alert" role="alert" tabIndex={-1}>{state.message}</p>}
      <fieldset disabled={pending} className="min-w-0 space-y-5">
      <div className="account-field"><label htmlFor="category-name">Nombre de la categoría</label><input id="category-name" className="auth-input" name="name" maxLength={80} placeholder="Ej. Mascotas o Trabajo independiente" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required {...attrs("name")} />{message("name")}</div>
      <div className="account-field"><label htmlFor="category-type">Tipo de categoría</label><select id="category-type" className="auth-input" name={category ? undefined : "categoryType"} disabled={Boolean(category)} value={values.categoryType} onChange={(e) => setValues({ ...values, categoryType: e.target.value as CategoryType })} {...attrs("categoryType")}>{Object.entries(CATEGORY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{category && <input type="hidden" name="categoryType" value={values.categoryType} />}{message("categoryType")}<p className="field-help">El tipo se define al crearla y no cambia después, para conservar la clasificación del historial.</p></div>
      <fieldset><legend className="mb-2 text-sm font-semibold">Icono</legend><div className="category-icon-options">{Object.entries(CATEGORY_ICONS).map(([value, label]) => <label key={value} className="category-icon-option" title={label}><input type="radio" name="icon" value={value} checked={values.icon === value} onChange={() => setValues({ ...values, icon: value as keyof typeof CATEGORY_ICONS })} aria-label={label} /><span><CategoryIcon name={value} /></span></label>)}</div>{message("icon")}</fieldset>
      <fieldset><legend className="mb-2 text-sm font-semibold">Color</legend><div className="flex flex-wrap gap-2">{colors.map(({ value, label }) => <label key={value} className="color-option" style={{ "--account-color": value } as React.CSSProperties} title={label}><input type="radio" name="color" value={value} checked={values.color === value} onChange={() => setValues({ ...values, color: value })} aria-label={label} /><span aria-hidden="true" /></label>)}</div>{message("color")}</fieldset>
      <div className="category-preview" aria-label="Vista previa"><span className="category-symbol" style={{ backgroundColor: `${values.color}22` }}><CategoryIcon name={values.icon} /></span><div className="min-w-0"><p className="break-words font-semibold">{values.name.trim() || "Tu categoría"}</p><p className="mt-1 text-xs text-[var(--muted)]">{CATEGORY_TYPES[values.categoryType]}</p></div></div>
      <div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose} disabled={pending}>Cancelar</button><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Guardando…" : category ? "Guardar cambios" : "Crear categoría"}</button></div>
      </fieldset>
    </form>
  </Modal>;
}
