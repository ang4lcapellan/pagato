import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const cn = (...values: ClassValue[]) => twMerge(clsx(values));
export const formatMoney = (value: number, hidden = false, compact = false) => hidden ? 'RD$ ••••••' : new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', currencyDisplay: 'narrowSymbol', minimumFractionDigits: compact ? 0 : 2, maximumFractionDigits: compact ? 0 : 2 }).format(value).replace('$', 'RD$ ');
export const formatDate = (value: string) => format(new Date(`${value}T12:00:00`), "d MMM yyyy", { locale: es });
export const formatPercent = (value: number) => new Intl.NumberFormat('es-DO', { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
export const transactionSign = (type: string) => type === 'income' ? '+' : type === 'expense' ? '-' : '';
