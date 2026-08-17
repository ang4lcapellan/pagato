# PagaTo’

Plataforma de finanzas personales con frontend web navegable y backend ASP.NET Core en desarrollo.

## Estado actual

- Web React: interfaz navegable conectada a los contratos HTTP del backend; conserva mocks solo como referencia visual no usada por las páginas principales.
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
npm run typecheck
npm run dev
```

La web usa `VITE_API_BASE_URL`. Copia `apps/web/.env.example` a un archivo local `.env.local` si necesitas cambiar `http://localhost:5147/api/v1`. No guardes secretos en variables `VITE_*`, porque se incluyen en el navegador.

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

## Integración local

1. Configura `ConnectionStrings:PagatoDatabase` y `Jwt:SigningKey` con `dotnet user-secrets` en `PagaTo.Api`.
2. Aplica la migración únicamente a una base de desarrollo autorizada.
3. Inicia la API en `http://localhost:5147`.
4. Inicia Vite en `http://localhost:5173`.

El access token vive solo en memoria. El refresh token se entrega como cookie `HttpOnly`, se rota y nunca se guarda en `localStorage`.

## Limitaciones

- La conexión y migración de Neon `development` están bloqueadas hasta confirmar la rotación de la credencial previamente expuesta.
- La migración no está aplicada a Neon.
- Recuperación de contraseña no tiene proveedor de correo.
- Tags, receipts, reportes avanzados y offline están pendientes.
- No existe despliegue productivo.

## Próximos pasos

Rotar la credencial Neon expuesta durante configuración, validar la migración exclusivamente en `development` y ejecutar Testcontainers con Docker Desktop activo.
