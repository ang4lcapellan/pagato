using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PagaTo.Application;
using PagaTo.Domain;
using PagaTo.Infrastructure;

namespace PagaTo.Api.Controllers;

[Authorize, Route("api/v1/transactions")]
public sealed class TransactionsController(PagaToDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct)
    {
        var query = db.Transactions.AsNoTracking().Where(x => x.UserId == CurrentUserId);
        if (from.HasValue) query = query.Where(x => x.TransactionDate >= from);
        if (to.HasValue) query = query.Where(x => x.TransactionDate <= to);
        return Ok(await query.OrderByDescending(x => x.TransactionDate).Take(200).ToListAsync(ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var entity = await db.Transactions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId, ct);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTransactionRequest request, CancellationToken ct)
    {
        var account = await db.Accounts.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.AccountId && x.UserId == CurrentUserId && x.IsActive, ct);
        if (account is null) return ValidationProblem("Account is unavailable or does not belong to the current user.");
        if (account.CurrencyCode != request.CurrencyCode) return ValidationProblem("Transaction currency must match the account currency.");
        if (request.CategoryId.HasValue && !await CategoryAllowed(request.CategoryId.Value, request.Type, ct)) return ValidationProblem("Category is invalid for this transaction.");
        var entity = new FinancialTransaction(CurrentUserId, request.Type, request.Amount, request.CurrencyCode,
            request.TransactionDate, request.AccountId, request.CategoryId, request.Description);
        db.Transactions.Add(entity); await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTransactionRequest request, CancellationToken ct)
    {
        var entity = await db.Transactions.SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId && x.Type != TransactionType.Transfer, ct);
        if (entity is null) return NotFound();
        if (request.CategoryId.HasValue && !await CategoryAllowed(request.CategoryId.Value, entity.Type, ct)) return ValidationProblem("Category is invalid for this transaction.");
        entity.Update(request.Amount, request.TransactionDate, request.CategoryId, request.Description, request.Status);
        await db.SaveChangesAsync(ct); return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Transactions.SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId, ct);
        if (entity is null) return NotFound(); entity.Delete(); await db.SaveChangesAsync(ct); return NoContent();
    }

    private async Task<bool> CategoryAllowed(Guid id, TransactionType type, CancellationToken ct)
    {
        var expected = type == TransactionType.Income ? CategoryType.Income : CategoryType.Expense;
        return await db.Categories.AnyAsync(x => x.Id == id && x.IsActive && x.Type == expected && (x.IsSystem || x.UserId == CurrentUserId), ct);
    }

    private ActionResult ValidationProblem(string message) => BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]> { ["request"] = [message] }) { Title = "Validation failed" });
}

