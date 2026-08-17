using PagaTo.Domain;

namespace PagaTo.Application;

public sealed record RegisterRequest(string Email, string Password, string DisplayName);
public sealed record LoginRequest(string Email, string Password, string? DeviceInfo);
public sealed record RefreshRequest(string? DeviceInfo);
public sealed record AuthResponse(string AccessToken, DateTimeOffset AccessTokenExpiresAt);

public sealed record CreateAccountRequest(string Name, AccountType Type, string CurrencyCode, decimal InitialBalance,
    DateOnly InitialBalanceDate, string? Description);
public sealed record UpdateAccountRequest(string Name, string? Description, bool IsActive, bool IncludeInNetWorth, bool IsFavorite);
public sealed record AccountResponse(Guid Id, string Name, AccountType Type, string CurrencyCode, decimal InitialBalance,
    decimal CurrentBalance, bool IsActive, bool IsFavorite);

public sealed record CreateCategoryRequest(string Name, CategoryType Type);
public sealed record UpdateCategoryRequest(string Name, bool IsActive);

public sealed record CreateTransactionRequest(TransactionType Type, decimal Amount, string CurrencyCode,
    DateTimeOffset TransactionDate, Guid AccountId, Guid? CategoryId, string Description);
public sealed record UpdateTransactionRequest(decimal Amount, DateTimeOffset TransactionDate, Guid? CategoryId,
    string Description, TransactionStatus Status);

public sealed record CreateTransferRequest(decimal Amount, string CurrencyCode, DateTimeOffset TransactionDate,
    Guid SourceAccountId, Guid DestinationAccountId, string Description);

public sealed record CreateBudgetRequest(Guid? CategoryId, string Name, decimal Amount, string CurrencyCode,
    BudgetPeriodType PeriodType, DateOnly StartDate, DateOnly EndDate, decimal WarningThreshold);
public sealed record UpdateBudgetRequest(string Name, decimal Amount, decimal WarningThreshold, BudgetStatus Status);
