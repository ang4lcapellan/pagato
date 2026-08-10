using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PagaTo.Application;
using PagaTo.Domain;
using PagaTo.Infrastructure;

namespace PagaTo.Api.Controllers;

[Authorize, Route("api/v1/accounts")]
public sealed class AccountsController(PagaToDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AccountResponse>>> GetAll(CancellationToken ct)
    {
        var accounts = await db.Accounts.AsNoTracking().Where(x => x.UserId == CurrentUserId).OrderBy(x => x.Name).ToListAsync(ct);
        var result = new List<AccountResponse>();
        foreach (var account in accounts) result.Add(new AccountResponse(account.Id, account.Name, account.Type, account.CurrencyCode,
            account.InitialBalance, await Balance(account.Id, account.InitialBalance, ct), account.IsActive, account.IsFavorite));
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AccountResponse>> Get(Guid id, CancellationToken ct)
    {
        var account = await db.Accounts.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId, ct);
        return account is null ? NotFound() : Ok(new AccountResponse(account.Id, account.Name, account.Type, account.CurrencyCode,
            account.InitialBalance, await Balance(account.Id, account.InitialBalance, ct), account.IsActive, account.IsFavorite));
    }

    [HttpPost]
    public async Task<ActionResult> Create(CreateAccountRequest request, CancellationToken ct)
    {
        var entity = new Account(CurrentUserId, request.Name, request.Type, request.CurrencyCode, request.InitialBalance, request.InitialBalanceDate);
        entity.Update(request.Name, request.Description, true, true, false); db.Accounts.Add(entity); await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateAccountRequest request, CancellationToken ct)
    {
        var entity = await db.Accounts.SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId, ct);
        if (entity is null) return NotFound(); entity.Update(request.Name, request.Description, request.IsActive, request.IncludeInNetWorth, request.IsFavorite);
        await db.SaveChangesAsync(ct); return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Accounts.SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId, ct);
        if (entity is null) return NotFound(); entity.Delete(); await db.SaveChangesAsync(ct); return NoContent();
    }

    private async Task<decimal> Balance(Guid accountId, decimal initial, CancellationToken ct)
    {
        var movements = await db.Transactions.AsNoTracking().Where(x => x.UserId == CurrentUserId && x.AccountId == accountId && x.Status == TransactionStatus.Completed)
            .SumAsync(x => x.Type == TransactionType.Income ? x.Amount : -x.Amount, ct);
        var sent = await (from t in db.Transfers join tr in db.Transactions on t.TransactionId equals tr.Id where t.UserId == CurrentUserId && t.SourceAccountId == accountId && tr.Status == TransactionStatus.Completed select tr.Amount).SumAsync(ct);
        var received = await (from t in db.Transfers join tr in db.Transactions on t.TransactionId equals tr.Id where t.UserId == CurrentUserId && t.DestinationAccountId == accountId && tr.Status == TransactionStatus.Completed select tr.Amount).SumAsync(ct);
        return initial + movements - sent + received;
    }
}

