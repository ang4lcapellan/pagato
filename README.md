# PagaTo’

Plataforma de finanzas personales con frontend web navegable y backend ASP.NET Core en desarrollo.

## Estado actual

- Web React: interfaz visual con mocks, temas claro/oscuro y rutas navegables.
- API .NET 10: base funcional con Identity, JWT, refresh tokens, módulos financieros MVP y OpenAPI.
- PostgreSQL: migración inicial generada; pendiente de aplicar a Neon `development` después de rotar la credencial de conexión.
- Móvil y sincronización offline: futuros.

## Stack

Web: React 19, TypeScript, Vite, Tailwind CSS, React Router y TanStack Query.

Backend: ASP.NET Core 10, C#, EF Core 10, Npgsql, Identity, FluentValidation, Serilog, Swagger/OpenAPI, xUnit y Testcontainers PostgreSQL.

## Estructura

- `apps/web`: aplicación visual existente.
- `apps/api`: solución `PagaTo.sln`, proyectos `src` y `tests`.
- `Fase 3 Desarrollo/Backend`: auditoría y documentación backend.
- `Fase 3 Desarrollo/Database`: diseño inicial; el SQL completo permanece ignorado.

## Web

```powershell
cd apps/web
npm install
npm run dev
```

## API

Requiere .NET SDK 10. Los secretos se configuran con `dotnet user-secrets`; nunca en `appsettings` o Git. Consulta `Fase 3 Desarrollo/Backend/08_Local_Development.md`.

```powershell
cd apps/api
dotnet tool restore
dotnet restore
dotnet build PagaTo.sln
dotnet run --project src/PagaTo.Api
```

API: `http://localhost:5147`. Swagger: `http://localhost:5147/swagger`. Health: `http://localhost:5147/health`.

## Pruebas

```powershell
cd apps/api
dotnet test PagaTo.sln
```

Las pruebas de integración requieren Docker Desktop y crean PostgreSQL efímero; nunca usan Neon.

## Limitaciones

- Frontend aún no consume la API.
- La migración no está aplicada a Neon.
- Recuperación de contraseña no tiene proveedor de correo.
- Tags, receipts, reportes avanzados y offline están pendientes.
- No existe despliegue productivo.

## Próximos pasos

Rotar la credencial Neon expuesta durante configuración, validar la migración en `development`, ejecutar Testcontainers con Docker activo y después integrar Auth desde el frontend.
