export const mockUser = { name: 'Alex Rodríguez', email: 'alex@ejemplo.com', locale: 'es-DO', currency: 'DOP', timezone: 'America/Santo_Domingo' };
export const mockAccounts = [
  { id: 'a1', name: 'Cuenta principal', type: 'Cuenta bancaria', balance: 82450, color: 'primary', active: true },
  { id: 'a2', name: 'Ahorros', type: 'Ahorros', balance: 120000, color: 'success', active: true },
  { id: 'a3', name: 'Efectivo', type: 'Efectivo', balance: 8750, color: 'warning', active: true },
  { id: 'a4', name: 'Tarjeta diaria', type: 'Tarjeta de crédito', balance: -18450, color: 'error', active: true, availableCredit: 56550 },
];
export const mockTransactions = [
  { id: 't1', date: '2026-08-05', description: 'Supermercado Nacional', category: 'Alimentación', account: 'Tarjeta diaria', type: 'expense', amount: 4850, status: 'Completada' },
  { id: 't2', date: '2026-08-04', description: 'Nómina', category: 'Ingresos', account: 'Cuenta principal', type: 'income', amount: 52000, status: 'Completada' },
  { id: 't3', date: '2026-08-03', description: 'Transferencia a ahorros', category: 'Transferencia', account: 'Principal → Ahorros', type: 'transfer', amount: 15000, status: 'Completada' },
  { id: 't4', date: '2026-08-02', description: 'Internet del hogar', category: 'Servicios', account: 'Cuenta principal', type: 'expense', amount: 2350, status: 'Pendiente' },
  { id: 't5', date: '2026-08-01', description: 'Café y merienda', category: 'Restaurantes', account: 'Efectivo', type: 'expense', amount: 620, status: 'Completada' },
];
export const mockBudgets = [
  { id: 'b1', category: 'Alimentación', budgeted: 18000, spent: 11450, icon: 'restaurant', color: 'primary' },
  { id: 'b2', category: 'Transporte', budgeted: 9000, spent: 7350, icon: 'directions_car', color: 'warning' },
  { id: 'b3', category: 'Entretenimiento', budgeted: 6000, spent: 6200, icon: 'movie', color: 'error' },
  { id: 'b4', category: 'Servicios', budgeted: 12000, spent: 4100, icon: 'home', color: 'success' },
];
export const cashFlow = [{ month: 'Mar', income: 48000, expense: 31800 }, { month: 'Abr', income: 52000, expense: 34100 }, { month: 'May', income: 50000, expense: 37600 }, { month: 'Jun', income: 54000, expense: 35200 }, { month: 'Jul', income: 52000, expense: 40100 }, { month: 'Ago', income: 52000, expense: 31200 }];
export const notifications = [{ id: 'n1', text: 'Transporte está cerca de su límite.', read: false }, { id: 'n2', text: 'La exportación visual está disponible.', read: true }];
export const sessions = [{ id: 's1', device: 'Chrome en Windows', current: true }, { id: 's2', device: 'Android', current: false }];
export const mockPreferences = { theme: 'system', language: 'es', currency: 'DOP', hideAmounts: false };
