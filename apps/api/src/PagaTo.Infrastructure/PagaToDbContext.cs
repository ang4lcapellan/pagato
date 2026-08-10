using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PagaTo.Domain;

namespace PagaTo.Infrastructure;

public sealed class PagaToDbContext(DbContextOptions<PagaToDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<FinancialTransaction> Transactions => Set<FinancialTransaction>();
    public DbSet<Transfer> Transfers => Set<Transfer>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.HasDefaultSchema("pagato");
        ConfigureIdentity(builder);
        ConfigureProfiles(builder);
        ConfigureAccounts(builder);
        ConfigureCategories(builder);
        ConfigureTransactions(builder);
        ConfigureTransfers(builder);
        ConfigureBudgets(builder);
        ConfigureRefreshTokens(builder);
        SeedCategories(builder);
    }

    private static void ConfigureIdentity(ModelBuilder b)
    {
        b.Entity<ApplicationUser>(e =>
        {
            e.ToTable("users");
            e.Property(x => x.Email).HasMaxLength(320);
            e.Property(x => x.NormalizedEmail).HasColumnName("email_normalized").HasMaxLength(320);
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });
        b.Entity<IdentityRole<Guid>>().ToTable("roles");
        b.Entity<IdentityRole<Guid>>().HasData(
            new IdentityRole<Guid> { Id = Guid.Parse("30000000-0000-0000-0000-000000000001"), Name = "User", NormalizedName = "USER", ConcurrencyStamp = "pagato-role-user-v1" },
            new IdentityRole<Guid> { Id = Guid.Parse("30000000-0000-0000-0000-000000000002"), Name = "PlatformAdmin", NormalizedName = "PLATFORMADMIN", ConcurrencyStamp = "pagato-role-admin-v1" });
        b.Entity<IdentityUserRole<Guid>>().ToTable("user_roles");
        b.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims");
        b.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins");
        b.Entity<IdentityRoleClaim<Guid>>().ToTable("role_claims");
        b.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens");
    }

    private static void ConfigureProfiles(ModelBuilder b)
    {
        b.Entity<UserProfile>(e =>
        {
            e.ToTable("user_profiles"); e.HasKey(x => x.Id); e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id"); e.HasIndex(x => x.UserId).IsUnique();
            e.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(120);
            e.Property(x => x.PreferredLanguage).HasColumnName("preferred_language").HasMaxLength(2);
            e.Property(x => x.BaseCurrency).HasColumnName("base_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.TimeZone).HasColumnName("time_zone").HasMaxLength(100);
            Audit(e);
            e.HasOne<ApplicationUser>().WithOne().HasForeignKey<UserProfile>(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureAccounts(ModelBuilder b)
    {
        b.Entity<Account>(e =>
        {
            e.ToTable("accounts"); e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.UserId, x.Id });
            e.Property(x => x.Id).HasColumnName("id"); e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(120);
            e.Property(x => x.Type).HasColumnName("account_type").HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.InitialBalance).HasColumnName("initial_balance").HasPrecision(18, 2);
            e.Property(x => x.InitialBalanceDate).HasColumnName("initial_balance_date");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(1000);
            e.Property(x => x.InstitutionName).HasColumnName("institution_name").HasMaxLength(160);
            e.Property(x => x.LastFourDigits).HasColumnName("last_four_digits").HasMaxLength(4).IsFixedLength();
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.IncludeInNetWorth).HasColumnName("include_in_net_worth");
            e.Property(x => x.IsFavorite).HasColumnName("is_favorite");
            e.Property(x => x.Icon).HasColumnName("icon").HasMaxLength(80);
            e.Property(x => x.ColorToken).HasColumnName("color_token").HasMaxLength(80);
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at"); Audit(e);
            e.HasQueryFilter(x => x.DeletedAt == null);
            e.HasIndex(x => new { x.UserId, x.IsActive }).HasDatabaseName("ix_accounts_user_active").HasFilter("deleted_at IS NULL");
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureCategories(ModelBuilder b)
    {
        b.Entity<Category>(e =>
        {
            e.ToTable("categories", t => t.HasCheckConstraint("ck_categories_ownership", "(is_system AND user_id IS NULL) OR (NOT is_system AND user_id IS NOT NULL)"));
            e.HasKey(x => x.Id); e.Property(x => x.Id).HasColumnName("id"); e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(120); e.Property(x => x.Type).HasColumnName("category_type").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Icon).HasColumnName("icon").HasMaxLength(80); e.Property(x => x.ColorToken).HasColumnName("color_token").HasMaxLength(80);
            e.Property(x => x.IsSystem).HasColumnName("is_system"); e.Property(x => x.IsActive).HasColumnName("is_active"); Audit(e);
            e.HasIndex(x => new { x.UserId, x.Type }).HasDatabaseName("ix_categories_user_type");
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureTransactions(ModelBuilder b)
    {
        b.Entity<FinancialTransaction>(e =>
        {
            e.ToTable("transactions", t => t.HasCheckConstraint("ck_transactions_amount_positive", "amount > 0"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.UserId, x.Id });
            e.Property(x => x.Id).HasColumnName("id"); e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Type).HasColumnName("transaction_type").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2); e.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.TransactionDate).HasColumnName("transaction_date"); e.Property(x => x.Description).HasColumnName("description").HasMaxLength(300);
            e.Property(x => x.AccountId).HasColumnName("account_id"); e.Property(x => x.CategoryId).HasColumnName("category_id");
            e.Property(x => x.PaymentMethod).HasColumnName("payment_method").HasMaxLength(60); e.Property(x => x.MerchantOrPayee).HasColumnName("merchant_or_payee").HasMaxLength(180);
            e.Property(x => x.ReferenceNumber).HasColumnName("reference_number").HasMaxLength(120); e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(2000); e.Property(x => x.DeletedAt).HasColumnName("deleted_at"); Audit(e);
            e.HasQueryFilter(x => x.DeletedAt == null);
            e.HasIndex(x => new { x.UserId, x.TransactionDate }).HasDatabaseName("ix_transactions_user_date").IsDescending(false, true).HasFilter("deleted_at IS NULL");
            e.HasIndex(x => new { x.UserId, x.AccountId, x.TransactionDate }).HasDatabaseName("ix_transactions_user_account_date").IsDescending(false, false, true).HasFilter("deleted_at IS NULL");
            e.HasIndex(x => new { x.UserId, x.CategoryId, x.TransactionDate }).HasDatabaseName("ix_transactions_user_category_date").IsDescending(false, false, true).HasFilter("deleted_at IS NULL");
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Account>().WithMany().HasForeignKey(x => new { x.UserId, x.AccountId }).HasPrincipalKey(x => new { x.UserId, x.Id }).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureTransfers(ModelBuilder b)
    {
        b.Entity<Transfer>(e =>
        {
            e.ToTable("transfers", t => t.HasCheckConstraint("ck_transfers_accounts_differ", "source_account_id <> destination_account_id"));
            e.HasKey(x => x.TransactionId); e.Property(x => x.TransactionId).HasColumnName("transaction_id"); e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.SourceAccountId).HasColumnName("source_account_id"); e.Property(x => x.DestinationAccountId).HasColumnName("destination_account_id");
            e.HasOne<FinancialTransaction>().WithOne().HasForeignKey<Transfer>(x => x.TransactionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Account>().WithMany().HasForeignKey(x => new { x.UserId, x.SourceAccountId }).HasPrincipalKey(x => new { x.UserId, x.Id }).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Account>().WithMany().HasForeignKey(x => new { x.UserId, x.DestinationAccountId }).HasPrincipalKey(x => new { x.UserId, x.Id }).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.UserId, x.TransactionId }).HasDatabaseName("ix_transfers_user_transaction");
        });
    }

    private static void ConfigureBudgets(ModelBuilder b)
    {
        b.Entity<Budget>(e =>
        {
            e.ToTable("budgets", t => { t.HasCheckConstraint("ck_budgets_amount_positive", "amount > 0"); t.HasCheckConstraint("ck_budgets_dates", "start_date <= end_date"); t.HasCheckConstraint("ck_budgets_threshold", "warning_threshold BETWEEN 0 AND 100"); });
            e.HasKey(x => x.Id); e.Property(x => x.Id).HasColumnName("id"); e.Property(x => x.UserId).HasColumnName("user_id"); e.Property(x => x.CategoryId).HasColumnName("category_id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(120); e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2);
            e.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength(); e.Property(x => x.PeriodType).HasColumnName("period_type").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.StartDate).HasColumnName("start_date"); e.Property(x => x.EndDate).HasColumnName("end_date"); e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.WarningThreshold).HasColumnName("warning_threshold").HasPrecision(5, 2); Audit(e);
            e.HasIndex(x => new { x.UserId, x.StartDate, x.EndDate }).HasDatabaseName("ix_budgets_user_dates");
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict); e.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureRefreshTokens(ModelBuilder b)
    {
        b.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens"); e.HasKey(x => x.Id); e.Property(x => x.Id).HasColumnName("id"); e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.TokenHash).HasColumnName("token_hash").HasMaxLength(64); e.HasIndex(x => x.TokenHash).IsUnique();
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at"); e.Property(x => x.RevokedAt).HasColumnName("revoked_at"); e.Property(x => x.ReplacedByTokenId).HasColumnName("replaced_by_token_id");
            e.Property(x => x.DeviceInfo).HasColumnName("device_info").HasMaxLength(300); Audit(e);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void Audit<TEntity>(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> e) where TEntity : Entity
    {
        e.Property(x => x.CreatedAt).HasColumnName("created_at"); e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void SeedCategories(ModelBuilder b)
    {
        var created = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var expenses = new[] { "Alimentación", "Transporte", "Vivienda", "Servicios", "Salud", "Educación", "Entretenimiento", "Ropa", "Deudas", "Otros" };
        var incomes = new[] { "Salario", "Trabajo independiente", "Venta", "Regalo", "Reembolso", "Rendimiento", "Otros" };
        var rows = expenses.Select((name, i) => new { Id = Guid.Parse($"10000000-0000-0000-0000-{i + 1:000000000000}"), UserId = (Guid?)null, Name = name, Type = CategoryType.Expense, Icon = "category", ColorToken = (string?)null, IsSystem = true, IsActive = true, CreatedAt = created, UpdatedAt = created })
            .Concat(incomes.Select((name, i) => new { Id = Guid.Parse($"20000000-0000-0000-0000-{i + 1:000000000000}"), UserId = (Guid?)null, Name = name, Type = CategoryType.Income, Icon = "payments", ColorToken = (string?)null, IsSystem = true, IsActive = true, CreatedAt = created, UpdatedAt = created }));
        b.Entity<Category>().HasData(rows);
    }
}
