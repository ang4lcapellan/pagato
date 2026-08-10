using FluentValidation;

namespace PagaTo.Application;

internal static class ValidationRules
{
    public static IRuleBuilderOptions<T, string> Currency<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().Length(3).Matches("^[A-Z]{3}$");
}

public sealed class RegisterValidator : AbstractValidator<RegisterRequest>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(12).MaximumLength(128);
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(120);
    }
}

public sealed class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator() { RuleFor(x => x.Email).NotEmpty().EmailAddress(); RuleFor(x => x.Password).NotEmpty(); }
}

public sealed class CreateAccountValidator : AbstractValidator<CreateAccountRequest>
{
    public CreateAccountValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.CurrencyCode).Currency();
        RuleFor(x => x.Description).MaximumLength(1000);
    }
}

public sealed class CreateTransactionValidator : AbstractValidator<CreateTransactionRequest>
{
    public CreateTransactionValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.CurrencyCode).Currency();
        RuleFor(x => x.Description).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Type).NotEqual(Domain.TransactionType.Transfer)
            .WithMessage("Use the transfers endpoint for internal transfers.");
    }
}

public sealed class CreateTransferValidator : AbstractValidator<CreateTransferRequest>
{
    public CreateTransferValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.CurrencyCode).Currency();
        RuleFor(x => x.DestinationAccountId).NotEqual(x => x.SourceAccountId);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(300);
    }
}

public sealed class CreateBudgetValidator : AbstractValidator<CreateBudgetRequest>
{
    public CreateBudgetValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.CurrencyCode).Currency();
        RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate);
        RuleFor(x => x.WarningThreshold).InclusiveBetween(0, 100);
    }
}
