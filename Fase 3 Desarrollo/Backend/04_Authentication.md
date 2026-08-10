# Autenticación

ASP.NET Core Identity usa `ApplicationUser : IdentityUser<Guid>`. Los roles iniciales son `User` y `PlatformAdmin`; Premium no es un rol.

Endpoints: registro, login, refresh, logout lógico y perfil autenticado. El access token JWT dura 15 minutos por defecto. El refresh token es aleatorio, se persiste únicamente como SHA-256, rota al renovarse y admite revocación y encadenamiento de reemplazo.

La connection string y `Jwt:SigningKey` deben vivir en `dotnet user-secrets`. Nunca se registran passwords, JWT, refresh tokens o cadenas de conexión.

La credencial Neon usada durante la configuración apareció en la salida de una herramienta al fallar la conversión de URI. Fue retirada de user-secrets y debe rotarse en Neon antes de reconectar. No se conserva en archivos del proyecto.

