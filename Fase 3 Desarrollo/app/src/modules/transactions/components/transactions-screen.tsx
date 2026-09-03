"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { formatMoney, type FinancialAccount } from "@/modules/accounts/model";
import type { Category } from "@/modules/categories/model";
import { historyUrl, PAGE_SIZE, TRANSACTION_TYPES, type Transaction, type TransactionFilters, type TransactionHistory } from "../model";
import { TransactionEditor } from "./transaction-editor";
import { TransactionAmount, TransactionDeleteDialog, TransactionDetail } from "./transaction-detail";

type Panel = { kind: "create"; id: string } | { kind: "detail" | "edit" | "delete"; transaction: Transaction } | null;
export function TransactionsScreen({ history, filters, accounts, categories }: { history: TransactionHistory; filters: TransactionFilters; accounts: FinancialAccount[]; categories: Category[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState("");
  const saved = useCallback((message: string) => { setPanel(null); setNotice(message); router.refresh(); }, [router]);
  const create = () => { setNotice(""); setPanel({ kind: "create", id: crypto.randomUUID() }); };
  const pages = Math.max(1, Math.ceil(history.count / PAGE_SIZE));
  const dateLabel = (value: string) => new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
  return <>
    <header className="accounts-heading"><div><h1>Transacciones</h1><p>Consulta, filtra y administra tus movimientos.</p></div><button type="button" className="button button-primary new-account gap-2" onClick={create} aria-label="Nueva transacción"><Icon name="plus" /><span>Nueva transacción</span></button></header>
    {notice && <div role="status" className="account-success mt-5 flex items-center justify-between gap-2"><span>{notice}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => setNotice("")}><Icon name="close" /></button></div>}
    <section className="transaction-summaries" aria-label="Resumen del historial filtrado">
      {history.totals.length ? history.totals.map(total => <div key={total.currency} className="transaction-summary-row"><div><p>Ingresos · {total.currency}</p><strong className="transaction-money-income">{formatMoney(total.income, total.currency)}</strong></div><div><p>Gastos · {total.currency}</p><strong className="transaction-money-expense">{formatMoney(total.expense, total.currency)}</strong></div><div className="transaction-net"><p>Balance del período · {total.currency}</p><strong>{formatMoney(total.net, total.currency)}</strong></div></div>) : <div className="transaction-summary-empty"><Icon name="movements" /><p>Tu historial, más claro.<span>Los ingresos y gastos aparecerán aquí al registrarlos.</span></p></div>}
      <p className="field-help">Resumen de todos los resultados filtrados, no solo de esta página. No incluye transferencias ni mezcla monedas. No es el saldo de tus cuentas.</p>
    </section>
    <form method="get" action="/transactions" className="transaction-filters" key={JSON.stringify(filters)} aria-label="Filtrar transacciones">
      <label className="transaction-search"><span>Buscar por descripción</span><input className="auth-input" type="search" name="q" defaultValue={filters.q} placeholder="Buscar transacción" maxLength={240} /></label>
      <label><span>Desde</span><input className="auth-input" type="date" name="from" defaultValue={filters.from} /></label><label><span>Hasta</span><input className="auth-input" type="date" name="to" defaultValue={filters.to} /></label>
      <label><span>Cuenta</span><select name="account" className="auth-input" defaultValue={filters.account}><option value="">Todas las cuentas</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}{a.status === "archived" ? " (archivada)" : ""}</option>)}</select></label>
      <label><span>Categoría</span><select name="category" className="auth-input" defaultValue={filters.category}><option value="">Todas las categorías</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name} · {c.categoryType === "income" ? "Ingreso" : "Gasto"}{c.isActive ? "" : " (inactiva)"}</option>)}</select></label>
      <label><span>Tipo</span><select name="type" className="auth-input" defaultValue={filters.type}><option value="all">Todos los tipos</option>{Object.entries(TRANSACTION_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="transaction-filter-actions"><button type="submit" className="button button-primary">Aplicar filtros</button><Link href="/transactions" className="button button-secondary">Limpiar</Link></div>
    </form>
    <section aria-label="Historial de transacciones">
      {history.transactions.length ? <>
        <div className="transaction-table-wrap"><table className="transaction-table"><caption className="sr-only">Historial de transacciones; abre una descripción para ver el detalle</caption><thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Cuenta</th><th>Monto</th></tr></thead><tbody>{history.transactions.map(t => <tr key={t.id}><td>{dateLabel(t.occurredLocal)}</td><td><button className="transaction-open" onClick={() => setPanel({ kind: "detail", transaction: t })} aria-label={`Ver detalle: ${t.description || TRANSACTION_TYPES[t.type]}`}>{t.description || "Sin descripción"}<span>{TRANSACTION_TYPES[t.type]}</span></button></td><td>{t.categoryName || "Transferencia"}</td><td>{t.sourceName}{t.type === "transfer" && <span className="block text-[var(--muted)]">→ {t.destinationName}</span>}{t.type === "income" && t.destinationName}</td><td><TransactionAmount transaction={t} /></td></tr>)}</tbody></table></div>
        <div className="transaction-mobile-list">{history.transactions.map(t => <button className="transaction-mobile-row" key={t.id} onClick={() => setPanel({ kind: "detail", transaction: t })} aria-label={`Ver detalle: ${t.description || TRANSACTION_TYPES[t.type]}`}><time dateTime={t.occurredLocal}>{t.occurredLocal.slice(8, 10)}<span>{new Intl.DateTimeFormat("es", { month: "short", timeZone: "UTC" }).format(new Date(`${t.occurredLocal.slice(0, 10)}T12:00:00Z`))}</span><span>{t.occurredLocal.slice(0, 4)}</span></time><span className="transaction-mobile-description"><strong>{t.description || TRANSACTION_TYPES[t.type]}</strong><span>{t.categoryName || "Transferencia"}</span><small>{t.sourceName}{t.type === "transfer" ? ` → ${t.destinationName}` : t.type === "income" ? t.destinationName : ""}</small></span><TransactionAmount transaction={t} /></button>)}</div>
      </> : <div className="accounts-empty"><span className="empty-wallet"><Icon name="movements" /></span><h2 className="mt-5 text-xl font-bold">No hay movimientos para mostrar</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Registra tu primer ingreso, gasto o transferencia, o ajusta los filtros para encontrar movimientos anteriores.</p><button type="button" className="button button-primary mt-5" onClick={create}>Registrar movimiento</button></div>}
      <div className="transaction-pagination"><p role="status">{history.count} {history.count === 1 ? "movimiento" : "movimientos"} · Página {filters.page} de {pages}</p><nav aria-label="Páginas del historial">{filters.page > 1 && <Link href={historyUrl(filters, filters.page - 1)} className="button button-secondary">Anterior</Link>}{filters.page < pages && <Link href={historyUrl(filters, filters.page + 1)} className="button button-secondary">Siguiente</Link>}</nav></div>
    </section>
    {panel?.kind === "create" && <TransactionEditor id={panel.id} accounts={accounts} categories={categories} timezone={history.timezone} onClose={() => setPanel(null)} onSaved={saved} />}
    {panel?.kind === "edit" && <TransactionEditor key={`edit-${panel.transaction.id}`} id={panel.transaction.id} transaction={panel.transaction} accounts={accounts} categories={categories} timezone={history.timezone} onClose={() => setPanel(null)} onSaved={saved} />}
    {panel?.kind === "detail" && <TransactionDetail transaction={panel.transaction} timezone={history.timezone} onClose={() => setPanel(null)} onEdit={() => setPanel({ ...panel, kind: "edit" })} onDelete={() => setPanel({ ...panel, kind: "delete" })} />}
    {panel?.kind === "delete" && <TransactionDeleteDialog transaction={panel.transaction} onClose={() => setPanel({ ...panel, kind: "detail" })} onSaved={saved} />}
  </>;
}
