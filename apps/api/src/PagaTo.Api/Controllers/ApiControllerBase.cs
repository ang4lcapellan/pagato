using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace PagaTo.Api.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected Guid CurrentUserId => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
        ? id : throw new UnauthorizedAccessException("Authenticated user identifier is missing.");
}

