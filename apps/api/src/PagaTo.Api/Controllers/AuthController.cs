using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PagaTo.Application;
using PagaTo.Domain;
using PagaTo.Infrastructure;

namespace PagaTo.Api.Controllers;

[Route("api/v1/auth")]
public sealed class AuthController(UserManager<ApplicationUser> users, PagaToDbContext db, TokenService tokens) : ApiControllerBase
{
    private const string RefreshCookie = "pagato_refresh";

    [HttpPost("register"), AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = request.Email.Trim(), Email = request.Email.Trim() };
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            { ["identity"] = result.Errors.Select(x => x.Description).ToArray() }));
        await users.AddToRoleAsync(user, "User");
        db.UserProfiles.Add(new UserProfile(user.Id, request.DisplayName));
        var response = await IssueTokens(user, null, ct);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Me), response);
    }

    [HttpPost("login"), AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null || !user.IsActive || !await users.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Invalid credentials" });
        var response = await IssueTokens(user, request.DeviceInfo, ct);
        await db.SaveChangesAsync(ct);
        return Ok(response);
    }

    [HttpPost("refresh"), AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct)
    {
        if (!Request.Cookies.TryGetValue(RefreshCookie, out var rawToken) || string.IsNullOrWhiteSpace(rawToken))
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Refresh session is missing" });
        var existing = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == TokenService.Hash(rawToken), ct);
        if (existing is null || !existing.IsActive) return Unauthorized(new ProblemDetails { Status = 401, Title = "Invalid refresh token" });
        var user = await users.FindByIdAsync(existing.UserId.ToString());
        if (user is null || !user.IsActive) return Unauthorized();
        var next = tokens.CreateRefreshToken();
        var replacement = new RefreshToken(user.Id, next.Hash, next.ExpiresAt, request.DeviceInfo);
        existing.Revoke(replacement.Id); db.RefreshTokens.Add(replacement);
        var roles = await users.GetRolesAsync(user); var access = tokens.CreateAccessToken(user, roles);
        await db.SaveChangesAsync(ct);
        WriteRefreshCookie(next.Raw, next.ExpiresAt);
        return Ok(new AuthResponse(access.Token, access.ExpiresAt));
    }

    [HttpPost("logout"), AllowAnonymous]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (Request.Cookies.TryGetValue(RefreshCookie, out var rawToken) && !string.IsNullOrWhiteSpace(rawToken))
        {
            var token = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == TokenService.Hash(rawToken), ct);
            if (token is not null && token.IsActive) { token.Revoke(); await db.SaveChangesAsync(ct); }
        }
        Response.Cookies.Delete(RefreshCookie, CookieOptions());
        return NoContent();
    }

    [HttpGet("me"), Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var user = await users.FindByIdAsync(CurrentUserId.ToString());
        if (user is null) return NotFound();
        var profile = await db.UserProfiles.AsNoTracking().SingleAsync(x => x.UserId == user.Id, ct);
        return Ok(new { user.Id, user.Email, profile.DisplayName, profile.PreferredLanguage, profile.BaseCurrency, profile.CountryCode, profile.TimeZone });
    }

    private async Task<AuthResponse> IssueTokens(ApplicationUser user, string? deviceInfo, CancellationToken ct)
    {
        var roles = await users.GetRolesAsync(user); var access = tokens.CreateAccessToken(user, roles); var refresh = tokens.CreateRefreshToken();
        db.RefreshTokens.Add(new RefreshToken(user.Id, refresh.Hash, refresh.ExpiresAt, deviceInfo));
        WriteRefreshCookie(refresh.Raw, refresh.ExpiresAt);
        return new AuthResponse(access.Token, access.ExpiresAt);
    }

    private void WriteRefreshCookie(string token, DateTimeOffset expiresAt) =>
        Response.Cookies.Append(RefreshCookie, token, CookieOptions(expiresAt));

    private CookieOptions CookieOptions(DateTimeOffset? expiresAt = null) => new()
    {
        HttpOnly = true,
        Secure = Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = "/api/v1/auth",
        Expires = expiresAt,
        IsEssential = true
    };
}
