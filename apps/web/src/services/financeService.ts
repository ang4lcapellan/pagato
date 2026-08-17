import { apiRequest } from './apiClient';
import type { Account, AccountType, Budget, Category, CategoryType, Transaction, TransactionStatus, TransactionType } from './types';

export const accountsService = {
  list: () => apiRequest<Account[]>('/accounts'),
  create: (input: { name: string; type: AccountType; currencyCode: string; initialBalance: number; initialBalanceDate: string; description?: string }) =>
    apiRequest<{ id: string }>('/accounts', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: { name: string; description?: string; isActive: boolean; includeInNetWorth: boolean; isFavorite: boolean }) =>
    apiRequest<void>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id: string) => apiRequest<void>(`/accounts/${id}`, { method: 'DELETE' })
};
export const categoriesService = {
  list: () => apiRequest<Category[]>('/categories'),
  create: (name: string, type: CategoryType) => apiRequest<Category>('/categories', { method: 'POST', body: JSON.stringify({ name, type }) })
};
export const transactionsService = {
  list: () => apiRequest<Transaction[]>('/transactions'),
  create: (input: { type: Exclude<TransactionType, 'Transfer'>; amount: number; currencyCode: string; transactionDate: string; accountId: string; categoryId?: string; description: string }) =>
    apiRequest<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: { amount: number; transactionDate: string; categoryId?: string; description: string; status: TransactionStatus }) =>
    apiRequest<void>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id: string) => apiRequest<void>(`/transactions/${id}`, { method: 'DELETE' }),
  transfer: (input: { amount: number; currencyCode: string; transactionDate: string; sourceAccountId: string; destinationAccountId: string; description: string }) =>
    apiRequest<{ id: string }>('/transfers', { method: 'POST', body: JSON.stringify(input) })
};
export const budgetsService = {
  list: () => apiRequest<Budget[]>('/budgets'),
  create: (input: { categoryId?: string; name: string; amount: number; currencyCode: string; periodType: 'Monthly' | 'Custom'; startDate: string; endDate: string; warningThreshold: number }) =>
    apiRequest<Budget>('/budgets', { method: 'POST', body: JSON.stringify(input) }),
  remove: (id: string) => apiRequest<void>(`/budgets/${id}`, { method: 'DELETE' })
};

