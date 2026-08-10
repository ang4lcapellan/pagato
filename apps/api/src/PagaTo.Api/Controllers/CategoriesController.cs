using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PagaTo.Application;
using PagaTo.Domain;
using PagaTo.Infrastructure;

namespace PagaTo.Api.Controllers;

[Authorize, Route("api/v1/categories")]
public sealed class CategoriesController(PagaToDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await db.Categories.AsNoTracking()
        .Where(x => x.IsSystem || x.UserId == CurrentUserId).OrderBy(x => x.Type).ThenBy(x => x.Name).ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create(CreateCategoryRequest request, CancellationToken ct)
    {
        var entity = new Category(CurrentUserId, request.Name, request.Type); db.Categories.Add(entity); await db.SaveChangesAsync(ct);
        return Created($"/api/v1/categories/{entity.Id}", entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateCategoryRequest request, CancellationToken ct)
    {
        var entity = await db.Categories.SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId && !x.IsSystem, ct);
        if (entity is null) return NotFound(); entity.Update(request.Name, request.IsActive); await db.SaveChangesAsync(ct); return NoContent();
    }
}
