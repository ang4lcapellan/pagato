export type AccountType = 'Cash' | 'BankAccount' | 'Savings' | 'CreditCard' | 'DigitalWallet' | 'PettyCash' | 'Investment' | 'Other';
export type CategoryType = 'Income' | 'Expense';
export type TransactionType = 'Income' | 'Expense' | 'Transfer';
export type TransactionStatus = 'Completed' | 'Pending' | 'Scheduled' | 'Cancelled';

export interface AuthResponse { accessToken: string; accessTokenExpiresAt: string }
export interface UserProfile { id: string; email: string; displayName: string; preferredLanguage: string; baseCurrency: string; countryCode: string; timeZone: string }
export interface Account { id: string; name: string; type: AccountType; currencyCode: string; initialBalance: number; currentBalance: number; isActive: boolean; isFavorite: boolean }
export interface Category { id: string; userId: string | null; name: string; type: CategoryType; icon: string; colorToken: string | null; isSystem: boolean; isActive: boolean }
export interface Transaction { id: string; userId: string; type: TransactionType; amount: number; currencyCode: string; transactionDate: string; description: string; accountId: string | null; categoryId: string | null; status: TransactionStatus }
export interface Budget { id: string; name: string; amount: number; amountSpent: number; amountAvailable: number; percentageUsed: number; currencyCode: string; startDate: string; endDate: string; status: 'Active' | 'Paused' | 'Completed'; warningThreshold: number }

