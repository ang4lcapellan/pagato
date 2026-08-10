using PagaTo.Domain;

namespace PagaTo.Domain.Tests;

public sealed class DomainRulesTests
{
    [Fact]
    public void Transaction_rejects_non_positive_amount() => Assert.Throws<ArgumentOutOfRangeException>(() =>
        new FinancialTransaction(Guid.NewGuid(), TransactionType.Expense, 0, "DOP", DateTimeOffset.UtcNow,
            Guid.NewGuid(), null, "Compra"));

    [Fact]
    public void Transfer_rejects_same_account()
    {
        var account = Guid.NewGuid();
        Assert.Throws<ArgumentException>(() => new Transfer(Guid.NewGuid(), Guid.NewGuid(), account, account));
    }

    [Fact]
    public void Budget_rejects_invalid_period() => Assert.Throws<ArgumentException>(() =>
        new Budget(Guid.NewGuid(), null, "Mensual", 1000, "DOP", BudgetPeriodType.Monthly,
            new DateOnly(2026, 8, 31), new DateOnly(2026, 8, 1), 80));

    [Fact]
    public void System_category_cannot_have_owner() => Assert.Throws<ArgumentException>(() =>
        new Category(Guid.NewGuid(), "Sistema", CategoryType.Expense, true));
}

