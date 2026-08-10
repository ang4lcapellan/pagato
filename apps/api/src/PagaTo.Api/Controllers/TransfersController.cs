using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PagaTo.Application;
using PagaTo.Domain;
using PagaTo.Infrastructure;

namespace PagaTo.Api.Controllers;

[Authorize, Route("api/v1/transfers")]
public sealed class TransfersController(PagaToDbContext db) : ApiControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateTransferRequest request, CancellationToken ct)
    {
        var accounts = await db.Accounts.Where(x => x.UserId == CurrentUserId && x.IsActive &&
            (x.Id == request.SourceAccountId || x.Id == request.DestinationAccountId)).ToListAsync(ct);
        if (accounts.Count != 2) return BadRequest(new ProblemDetails { Title = "Both accounts must be active and owned by the current user", Status = 400 });
        if (accounts.Any(x => x.CurrencyCode != request.CurrencyCode)) return BadRequest(new ProblemDetails { Title = "Transfer currency must match both accounts", Status = 400 });

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var header = new FinancialTransaction(CurrentUserId, TransactionType.Transfer, request.Amount, request.CurrencyCode,
            request.TransactionDate, null, null, request.Description);
        db.Transactions.Add(header);
        db.Transfers.Add(new Transfer(header.Id, CurrentUserId, request.SourceAccountId, request.DestinationAccountId));
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct);
        return Created($"/api/v1/transactions/{header.Id}", new { header.Id });
    }
}

