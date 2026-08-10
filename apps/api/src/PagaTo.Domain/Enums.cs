namespace PagaTo.Domain;

public enum AccountType { Cash, BankAccount, Savings, CreditCard, DigitalWallet, PettyCash, Investment, Other }
public enum CategoryType { Income, Expense }
public enum TransactionType { Income, Expense, Transfer }
public enum TransactionStatus { Completed, Pending, Scheduled, Cancelled }
public enum BudgetPeriodType { Monthly, Custom }
public enum BudgetStatus { Active, Paused, Completed }

