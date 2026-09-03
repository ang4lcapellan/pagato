"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ACCOUNT_TYPES, CURRENCIES, formatMoney, totalsByCurrency, toUnits, type FinancialAccount } from "../model";
import { AccountEditor } from "./account-editor";
import { AccountDetail } from "./account-detail";

type Panel = { kind: "create"; id: string } | { kind: "edit" | "detail"; account: FinancialAccount } | null;
export function AccountsScreen({ accounts, defaultCurrency }: { accounts: FinancialAccount[]; defaultCurrency: string }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState("");
  const [notice, setNotice] = useState("");
  const onSaved = useCallback((message: string) => { setPanel(null); setNotice(message); router.refresh(); }, [router]);
  const active = accounts.filter((a) => a.status === "active");
  const totals = totalsByCurrency(accounts);
  const filtered = accounts.filter((a) => (status === "all" || a.status === status) && (!currency || a.currency === currency) && `${a.name} ${a.institution ?? ""} ${ACCOUNT_TYPES[a.accountType]}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));
  const create = () => { setNotice(""); setPanel({ kind: "create", id: crypto.randomUUID() }); };
  const distributionCurrency = active.some((a) => a.currency === defaultCurrency) ? defaultCurrency : active[0]?.currency;
  const distribution = active.filter((a) => a.currency === distributionCurrency && toUnits(a.balance) > BigInt(0));
  const totalPositive = distribution.reduce((sum, a) => sum + toUnits(a.balance), BigInt(0));
  return <>
    <header className="accounts-heading"><div><h1>Cuentas</h1><p>Organiza tu dinero por cuenta y propósito.</p></div><button type="button" className="button button-primary new-account gap-2" onClick={create} aria-label="Nueva cuenta"><Icon name="plus" /><span>Nueva cuenta</span></button></header>
    {notice && <div className="account-success mt-5 flex items-center justify-between gap-3" role="status"><span>{notice}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => setNotice("")}><Icon name="close" /></button></div>}
    <section aria-label="Resumen de cuentas activas" className="accounts-summary">
      <p className="text-sm text-[var(--muted)]">Saldo de cuentas activas</p>
      <div className="mt-2 flex flex-wrap gap-x-10 gap-y-4">{(totals.length ? totals : [{ currency: defaultCurrency, amount: "0" }]).map((total) => <div key={total.currency}><p className="money-value text-[1.75rem] font-bold leading-tight sm:text-[2.375rem]">{formatMoney(total.amount, total.currency)}</p><span className="text-xs font-semibold text-[var(--muted)]">{total.currency}</span></div>)}</div>
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{active.length} {active.length === 1 ? "cuenta activa" : "cuentas activas"} · Totales por moneda, sin conversión.</p>
    </section>
    <section aria-label="Tus cuentas">
      <div className="accounts-toolbar">
        <div className="account-filters" aria-label="Estado de las cuentas">{[["active", "Activas"], ["archived", "Archivadas"], ["all", "Todas"]].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>)}</div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <label className="min-w-0"><span className="sr-only">Buscar cuentas</span><input type="search" className="auth-input" placeholder="Buscar cuenta o institución" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <label><span className="sr-only">Filtrar por moneda</span><select className="auth-input" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="">Todas</option>{[...new Set(accounts.map((a) => a.currency))].sort().map((code) => <option key={code}>{code}</option>)}</select></label>
        </div>
      </div>
      {filtered.length ? <div className="accounts-grid">{filtered.map((account) => <article className="account-card" key={account.id} aria-label={account.name}>
        <button className="account-card-main" onClick={() => { setNotice(""); setPanel({ kind: "detail", account }); }} aria-label={`Ver detalle de ${account.name}`}>
          <span className="account-symbol" style={{ background: account.color ?? "#0B6B58" }}><Icon name="wallet" /></span>
          <span className="account-card-identity"><span className="block break-words font-bold">{account.name}</span><span className="mt-1 block break-words text-xs leading-5 text-[var(--muted)]">{account.institution || ACCOUNT_TYPES[account.accountType]}</span></span>
          <span className={`account-card-balance money-value ${toUnits(account.balance) < BigInt(0) ? "text-[var(--negative)]" : ""}`}>{formatMoney(account.balance, account.currency)}<span className="mt-1 block text-xs font-normal text-[var(--muted)]">{account.currency} · {account.status === "active" ? "Activa" : "Archivada"}</span></span>
        </button>
        <div className="account-card-footer"><span className="text-xs text-[var(--muted)]">{ACCOUNT_TYPES[account.accountType]}</span><button className="icon-button" aria-label={`Editar ${account.name}`} onClick={() => setPanel({ kind: "edit", account })}><Icon name="edit" /></button></div>
      </article>)}</div> : <div className="accounts-empty"><span className="empty-wallet"><Icon name="wallet" width="30" height="30" /></span><h2 className="mt-5 text-xl font-bold">{accounts.length ? "No encontramos cuentas" : "Tu dinero, bien organizado"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{accounts.length ? "Prueba otro nombre, moneda o estado. Las cuentas archivadas siguen guardadas aquí." : "Añade tu primera cuenta bancaria, tus ahorros o el efectivo de tu billetera. Tú decides por dónde comenzar."}</p>{accounts.length ? <button className="button button-secondary mt-5" onClick={() => { setStatus("all"); setCurrency(""); setSearch(""); }}>Limpiar filtros</button> : <button className="button button-primary mt-6 gap-2" onClick={create}><Icon name="plus" />Crear mi primera cuenta</button>}</div>}
      <p className="mt-4 text-xs text-[var(--muted)]">{filtered.length} {filtered.length === 1 ? "cuenta mostrada" : "cuentas mostradas"}</p>
    </section>
    {totalPositive > BigInt(0) && <section className="account-distribution" aria-label="Distribución por cuenta"><h2 className="text-lg font-bold">Distribución por cuenta</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Saldos positivos en {distributionCurrency}. No incluye deudas ni otras monedas.</p><div className="distribution-bar" aria-hidden="true">{distribution.map((a) => <span key={a.id} style={{ background: a.color ?? "#0B6B58", flexGrow: Number(toUnits(a.balance) * BigInt(10000) / totalPositive) }} />)}</div><ul className="flex flex-wrap gap-x-6 gap-y-3">{distribution.map((a) => <li key={a.id} className="flex min-w-0 items-center gap-2 text-xs"><span className="size-2.5 shrink-0 rounded-full" style={{ background: a.color ?? "#0B6B58" }} /><span className="break-words">{a.name} · {Number(toUnits(a.balance) * BigInt(1000) / totalPositive) / 10}%</span></li>)}</ul></section>}
    <p className="mt-6 text-xs leading-5 text-[var(--muted)]">Tus cuentas se guardan en PagaTo. No realizamos conexiones bancarias ni movimientos de dinero.</p>
    {panel?.kind === "create" && <AccountEditor id={panel.id} defaultCurrency={defaultCurrency in CURRENCIES ? defaultCurrency : "DOP"} onClose={() => setPanel(null)} onSaved={onSaved} />}
    {panel?.kind === "edit" && <AccountEditor account={panel.account} id={panel.account.id} defaultCurrency={defaultCurrency} onClose={() => setPanel(null)} onSaved={onSaved} />}
    {panel?.kind === "detail" && <AccountDetail account={panel.account} onClose={() => setPanel(null)} onEdit={() => setPanel({ kind: "edit", account: panel.account })} onSaved={onSaved} />}
  </>;
}
