using PagaTo.Application;
using PagaTo.Domain;

namespace PagaTo.Application.Tests;

public sealed class ValidatorTests
{
    [Fact]
    public void Account_validator_rejects_invalid_currency()
    {
        var result = new CreateAccountValidator().Validate(new CreateAccountRequest("Efectivo", AccountType.Cash, "peso", 0, DateOnly.FromDateTime(DateTime.UtcNow), null));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Transfer_validator_rejects_same_account()
    {
        var id = Guid.NewGuid();
        var result = new CreateTransferValidator().Validate(new CreateTransferRequest(100, "DOP", DateTimeOffset.UtcNow, id, id, "Transferencia"));
        Assert.False(result.IsValid);
    }
}

