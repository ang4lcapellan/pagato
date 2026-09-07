"use client";
import { usePresentation } from "@/modules/preferences/components/presentation-provider";
import { toUnits } from "@/modules/accounts/model";
import { getCategoryColor } from "@/modules/categories/model";
import { chartRatio, type CashPoint, type DashboardRange, type ExpenseSlice } from "../model";

export function CashFlow({ trend, range, currency }: { trend: CashPoint[]; range: DashboardRange; currency: string }) {
  const { t: tr, formatMoney, message: msg, formatDate, bucketLabel } = usePresentation();
  const max = trend.reduce((largest, p) => [p.income, p.expense].reduce((a, b) => toUnits(b) > toUnits(a) ? b : a, largest), "0");
  const hasData = toUnits(max) > BigInt(0);
  const width = 640, left = 20, plot = width - left * 2, bottom = 205, height = 170;
  const step = plot / Math.max(1, trend.length), bar = Math.min(28, step * .32);
  return <section className="dashboard-panel" aria-labelledby="cash-title"><div className="dashboard-panel-heading"><div><h2 id="cash-title">{tr("Flujo de efectivo")}</h2><p>{range.bucket === "month" ? tr("Por mes") : range.bucket === "week" ? tr("Por bloques de 7 días desde el inicio") : tr("Por día")} · {currency}</p></div></div>
    <div className="dashboard-legend"><span><i className="dashboard-dot dashboard-dot-income" />{tr("Ingresos")}</span><span><i className="dashboard-dot dashboard-dot-expense" />{tr("Gastos")}</span></div>
    {hasData ? <figure className="dashboard-flow"><figcaption className="sr-only">{tr("Comparación de ingresos y gastos. Las cifras exactas están en la tabla desplegable.")}</figcaption>
      <div className="dashboard-chart-scale">{tr("Máximo de la escala: ")}{formatMoney(max, currency)}</div>
      <svg viewBox={`0 0 ${width} 245`} aria-hidden="true" className="dashboard-bars">
        {[0, .5, 1].map(v => <line key={v} x1={left} x2={width - left} y1={bottom - v * height} y2={bottom - v * height} stroke="var(--border)" strokeDasharray={v ? "4 5" : undefined} />)}
        {trend.map((p, i) => { const x = left + i * step + step / 2; return <g key={p.date}>
          <title>{msg`${bucketLabel(p.date, range.bucket)}: ingresos ${formatMoney(p.income, currency)}, gastos ${formatMoney(p.expense, currency)}`}</title>
          {(["income", "expense"] as const).map((key, k) => { const h = chartRatio(p[key], max) / 100 * height; return <rect key={key} className={`dashboard-bar dashboard-bar-${key}`} x={x + (k ? 2 : -bar - 2)} y={bottom - h} width={bar} height={h} rx={Math.min(5, h / 2)} style={{ transformOrigin: `${x}px ${bottom}px`, animationDelay: `${Math.min(i, 6) * 35}ms` }} />; })}
          {(trend.length <= 12 || i % 2 === 0) && <text x={x} y={231} textAnchor="middle" fill="var(--muted)" fontSize="12">{bucketLabel(p.date, range.bucket)}</text>}
        </g>; })}
      </svg>
    </figure> : <div className="dashboard-empty"><p>{tr("No hay ingresos ni gastos en este período.")}</p><span>{tr("Los movimientos que registres aparecerán aquí. Las transferencias no forman parte de este gráfico.")}</span></div>}
    <details className="dashboard-chart-table"><summary>{tr("Ver cifras del gráfico")}</summary><div className="dashboard-table-scroll"><table><caption className="sr-only">{tr("Importes exactos en ")}{currency}{tr(". La fecha indica el inicio de cada bloque.")}</caption><thead><tr><th scope="col">{tr("Inicio del bloque")}</th><th scope="col">{tr("Ingresos")}</th><th scope="col">{tr("Gastos")}</th></tr></thead><tbody>{trend.map(p => <tr key={p.date}><th scope="row">{formatDate(p.date)}</th><td>{formatMoney(p.income, currency)}</td><td>{formatMoney(p.expense, currency)}</td></tr>)}</tbody></table></div></details>
  </section>;
}

export function CategoryDistribution({ slices, expense, currency }: { slices: ExpenseSlice[]; expense: string; currency: string }) {
  const { t: tr, formatMoney, formatNumber } = usePresentation();
  const segments = slices.map((s, index) => {
    const start = slices.slice(0, index).reduce((total, slice) => total + chartRatio(slice.amount, expense), 0);
    return `${getCategoryColor(s.color)} ${start}% ${index === slices.length - 1 ? 100 : start + chartRatio(s.amount, expense)}%`;
  });
  return <section className="dashboard-panel" aria-labelledby="distribution-title"><div className="dashboard-panel-heading"><div><h2 id="distribution-title">{tr("¿En qué estás gastando?")}</h2><p>{tr("Distribución por categorías · ")}{currency}</p></div></div>
    {slices.length ? <div className="dashboard-distribution"><div className="dashboard-donut" aria-hidden="true" style={{ background: `conic-gradient(${segments.join(",")})` }}><div><span>{tr("Gastos")}</span><strong>{slices.length === 6 && slices.at(-1)?.id === "other" ? tr("5 + otras") : slices.length}</strong><span>{tr("categorías")}</span></div></div>
      <ul className="dashboard-category-list">{slices.map(s => <li key={s.id}><div><i className="dashboard-dot" style={{ background: getCategoryColor(s.color) }} /><span>{s.id === 'other' ? tr(s.name) : s.name}</span></div><strong>{formatMoney(s.amount, currency)}<small>{formatNumber(chartRatio(s.amount, expense))}% · {s.count} {s.count === 1 ? tr("gasto") : tr("gastos")}</small></strong></li>)}</ul>
    </div> : <div className="dashboard-empty"><p>{tr("Todavía no hay gastos que distribuir.")}</p><span>{tr("Selecciona otro período o registra tu primer gasto.")}</span></div>}
  </section>;
}
