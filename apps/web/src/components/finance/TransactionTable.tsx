import { Badge, DropdownMenu, FinancialAmount, MaterialIcon, Pagination } from '../ui';
import { formatDate, transactionSign } from '../../lib/utils';
import type { Transaction } from '../../services/types';

type DataTableProps = {
  rows: Transaction[];
  accounts?: Record<string, string>;
  categories?: Record<string, string>;
};

const statusLabels: Record<Transaction['status'], string> = {
  Completed: 'Completada', Pending: 'Pendiente', Scheduled: 'Programada', Cancelled: 'Cancelada'
};

export function DataTable({ rows, accounts = {}, categories = {} }: DataTableProps) {
  return <div className="overflow-hidden rounded-2xl border border-border bg-surface"><div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-sm"><caption className="sr-only">Transacciones recientes</caption><thead className="bg-surface-container text-left text-xs text-text-secondary"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Descripción</th><th className="px-4 py-3">Categoría</th><th className="tablet-hide px-4 py-3">Cuenta</th><th className="px-4 py-3 text-right">Importe</th><th className="px-4 py-3">Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{rows.map((row)=><tr key={row.id} className="border-t border-border hover:bg-surface-container"><td className="whitespace-nowrap px-4 py-3 text-text-secondary">{formatDate(row.transactionDate)}</td><td className="px-4 py-3"><span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-surface-container"><MaterialIcon name={row.type==='Income'?'south_west':row.type==='Expense'?'north_east':'swap_horiz'} size={19}/></span>{row.description}</span></td><td className="px-4 py-3">{row.categoryId ? categories[row.categoryId] ?? 'Sin categoría' : 'Sin categoría'}</td><td className="tablet-hide px-4 py-3 text-text-secondary">{row.accountId ? accounts[row.accountId] ?? 'Cuenta' : '—'}</td><td className="amount px-4 py-3 text-right font-semibold"><FinancialAmount value={row.amount} prefix={transactionSign(row.type.toLowerCase() as 'income'|'expense'|'transfer')}/></td><td className="px-4 py-3"><Badge tone={row.status==='Pending'?'warning':row.status==='Cancelled'?'error':'success'}>{statusLabels[row.status]}</Badge></td><td className="px-1"><DropdownMenu label={`Acciones para ${row.description}`} items={['Ver detalle','Editar','Eliminar']}/></td></tr>)}</tbody></table></div><div className="border-t border-border p-3"><Pagination/></div></div>;
}
