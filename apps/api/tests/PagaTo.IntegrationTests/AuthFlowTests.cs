using System.Net;
using System.Net.Http.Json;
using PagaTo.Application;

namespace PagaTo.IntegrationTests;

public sealed class AuthFlowTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Protected_endpoint_rejects_anonymous_user()
    {
        var response = await _client.GetAsync("/api/v1/accounts");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task User_can_register_and_login()
    {
        var email = $"user-{Guid.NewGuid():N}@example.test";
        var password = "A-strong-test-password1!";
        var register = await _client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, password, "Test User"));
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var login = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password, "integration-test"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.False(string.IsNullOrWhiteSpace(auth?.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(auth?.RefreshToken));
    }
}
