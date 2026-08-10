using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PagaTo.Application;
using PagaTo.Domain;
using PagaTo.Infrastructure;

namespace PagaTo.Api.Controllers;

[Authorize, Route("api/v1/budgets")]
public sealed class BudgetsController(PagaToDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var budgets = await db.Budgets.AsNoTracking().Where(x => x.UserId == CurrentUserId).OrderByDescending(x => x.StartDate).ToListAsync(ct);
        var result = new List<object>();
        foreach (var budget in budgets)
        {
            var start = new DateTimeOffset(budget.StartDate.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            var end = new DateTimeOffset(budget.EndDate.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            var spent = await db.Transactions.AsNoTracking().Where(x => x.UserId == CurrentUserId && x.Type == TransactionType.Expense &&
                x.Status == TransactionStatus.Completed && x.CurrencyCode == budget.CurrencyCode && x.TransactionDate >= start && x.TransactionDate < end &&
                (!budget.CategoryId.HasValue || x.CategoryId == budget.CategoryId)).SumAsync(x => x.Amount, ct);
            result.Add(new { budget.Id, budget.Name, budget.Amount, AmountSpent = spent, AmountAvailable = budget.Amount - spent,
                PercentageUsed = budget.Amount == 0 ? 0 : decimal.Round(spent / budget.Amount * 100, 2), budget.CurrencyCode,
                budget.StartDate, budget.EndDate, budget.Status, budget.WarningThreshold });
        }
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateBudgetRequest request, CancellationToken ct)
    {
        if (request.CategoryId.HasValue && !await db.Categories.AnyAsync(x => x.Id == request.CategoryId && x.Type == CategoryType.Expense && x.IsActive && (x.IsSystem || x.UserId == CurrentUserId), ct))
            return BadRequest(new ProblemDetails { Title = "Budget category is invalid", Status = 400 });
        var entity = new Budget(CurrentUserId, request.CategoryId, request.Name, request.Amount, request.CurrencyCode,
            request.PeriodType, request.StartDate, request.EndDate, request.WarningThreshold);
        db.Budgets.Add(entity); await db.SaveChangesAsync(ct); return Created($"/api/v1/budgets/{entity.Id}", entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateBudgetRequest request, CancellationToken ct)
    {
        var entity = await db.Budgets.SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId, ct);
        if (entity is null) return NotFound(); entity.Update(request.Name, request.Amount, request.WarningThreshold, request.Status);
        await db.SaveChangesAsync(ct); return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Budgets.SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId, ct);
        if (entity is null) return NotFound(); db.Budgets.Remove(entity); await db.SaveChangesAsync(ct); return NoContent();
    }
}
