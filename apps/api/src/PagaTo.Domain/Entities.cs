namespace PagaTo.Domain;

public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; protected set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; protected set; } = DateTimeOffset.UtcNow;
    protected void Touch() => UpdatedAt = DateTimeOffset.UtcNow;
}

public sealed class UserProfile : Entity
{
    private UserProfile() { }
    public UserProfile(Guid userId, string displayName)
    {
        UserId = userId;
        DisplayName = displayName.Trim();
    }
    public Guid UserId { get; private set; }
    public string DisplayName { get; private set; } = string.Empty;
    public string PreferredLanguage { get; private set; } = "es";
    public string BaseCurrency { get; private set; } = "DOP";
    public string CountryCode { get; private set; } = "DO";
    public string TimeZone { get; private set; } = "America/Santo_Domingo";
}

public sealed class Account : Entity
{
    private Account() { }
    public Account(Guid userId, string name, AccountType type, string currencyCode, decimal initialBalance, DateOnly initialBalanceDate)
    {
        UserId = userId;
        Rename(name);
        Type = type;
        CurrencyCode = currencyCode.ToUpperInvariant();
        InitialBalance = initialBalance;
        InitialBalanceDate = initialBalanceDate;
    }
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public AccountType Type { get; private set; }
    public string CurrencyCode { get; private set; } = "DOP";
    public decimal InitialBalance { get; private set; }
    public DateOnly InitialBalanceDate { get; private set; }
    public string? Description { get; private set; }
    public string? InstitutionName { get; private set; }
    public string? LastFourDigits { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool IncludeInNetWorth { get; private set; } = true;
    public bool IsFavorite { get; private set; }
    public string? Icon { get; private set; }
    public string? ColorToken { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }

    public void Update(string name, string? description, bool isActive, bool includeInNetWorth, bool isFavorite)
    {
        Rename(name); Description = description?.Trim(); IsActive = isActive;
        IncludeInNetWorth = includeInNetWorth; IsFavorite = isFavorite; Touch();
    }
    public void Delete() { DeletedAt = DateTimeOffset.UtcNow; IsActive = false; Touch(); }
    private void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Account name is required.", nameof(name));
        Name = name.Trim();
    }
}

public sealed class Category : Entity
{
    private Category() { }
    public Category(Guid? userId, string name, CategoryType type, bool isSystem = false)
    {
        UserId = userId; Name = name.Trim(); Type = type; IsSystem = isSystem;
        if (isSystem != (userId is null)) throw new ArgumentException("System category ownership is invalid.");
    }
    public Guid? UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public CategoryType Type { get; private set; }
    public string Icon { get; private set; } = "category";
    public string? ColorToken { get; private set; }
    public bool IsSystem { get; private set; }
    public bool IsActive { get; private set; } = true;
    public void Update(string name, bool isActive) { Name = name.Trim(); IsActive = isActive; Touch(); }
}

public sealed class FinancialTransaction : Entity
{
    private FinancialTransaction() { }
    public FinancialTransaction(Guid userId, TransactionType type, decimal amount, string currencyCode,
        DateTimeOffset transactionDate, Guid? accountId, Guid? categoryId, string description)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        if (type != TransactionType.Transfer && accountId is null) throw new ArgumentException("Account is required.");
        UserId = userId; Type = type; Amount = amount; CurrencyCode = currencyCode.ToUpperInvariant();
        TransactionDate = transactionDate; AccountId = accountId; CategoryId = categoryId; Description = description.Trim();
    }
    public Guid UserId { get; private set; }
    public TransactionType Type { get; private set; }
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = "DOP";
    public DateTimeOffset TransactionDate { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public Guid? AccountId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string? PaymentMethod { get; private set; }
    public string? MerchantOrPayee { get; private set; }
    public string? ReferenceNumber { get; private set; }
    public TransactionStatus Status { get; private set; } = TransactionStatus.Completed;
    public string? Notes { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public void Update(decimal amount, DateTimeOffset date, Guid? categoryId, string description, TransactionStatus status)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        Amount = amount; TransactionDate = date; CategoryId = categoryId; Description = description.Trim(); Status = status; Touch();
    }
    public void Delete() { DeletedAt = DateTimeOffset.UtcNow; Touch(); }
}

public sealed class Transfer
{
    private Transfer() { }
    public Transfer(Guid transactionId, Guid userId, Guid sourceAccountId, Guid destinationAccountId)
    {
        if (sourceAccountId == destinationAccountId) throw new ArgumentException("Source and destination accounts must differ.");
        TransactionId = transactionId; UserId = userId; SourceAccountId = sourceAccountId; DestinationAccountId = destinationAccountId;
    }
    public Guid TransactionId { get; private set; }
    public Guid UserId { get; private set; }
    public Guid SourceAccountId { get; private set; }
    public Guid DestinationAccountId { get; private set; }
}

public sealed class Budget : Entity
{
    private Budget() { }
    public Budget(Guid userId, Guid? categoryId, string name, decimal amount, string currencyCode,
        BudgetPeriodType periodType, DateOnly startDate, DateOnly endDate, decimal warningThreshold)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        if (startDate > endDate) throw new ArgumentException("Start date must not exceed end date.");
        if (warningThreshold is < 0 or > 100) throw new ArgumentOutOfRangeException(nameof(warningThreshold));
        UserId = userId; CategoryId = categoryId; Name = name.Trim(); Amount = amount;
        CurrencyCode = currencyCode.ToUpperInvariant(); PeriodType = periodType; StartDate = startDate;
        EndDate = endDate; WarningThreshold = warningThreshold;
    }
    public Guid UserId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = "DOP";
    public BudgetPeriodType PeriodType { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public BudgetStatus Status { get; private set; } = BudgetStatus.Active;
    public decimal WarningThreshold { get; private set; } = 80;
    public void Update(string name, decimal amount, decimal warningThreshold, BudgetStatus status)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        if (warningThreshold is < 0 or > 100) throw new ArgumentOutOfRangeException(nameof(warningThreshold));
        Name = name.Trim(); Amount = amount; WarningThreshold = warningThreshold; Status = status; Touch();
    }
}

public sealed class RefreshToken : Entity
{
    private RefreshToken() { }
    public RefreshToken(Guid userId, string tokenHash, DateTimeOffset expiresAt, string? deviceInfo)
    {
        UserId = userId; TokenHash = tokenHash; ExpiresAt = expiresAt; DeviceInfo = deviceInfo;
    }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? RevokedAt { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }
    public string? DeviceInfo { get; private set; }
    public bool IsActive => RevokedAt is null && ExpiresAt > DateTimeOffset.UtcNow;
    public void Revoke(Guid? replacementId = null) { RevokedAt = DateTimeOffset.UtcNow; ReplacedByTokenId = replacementId; Touch(); }
}
