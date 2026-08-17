# Ejecución local integrada

## Requisitos

- Node.js y npm.
- .NET SDK 10.
- PostgreSQL de desarrollo accesible.
- Docker Desktop activo únicamente para pruebas Testcontainers.

## Secretos de API

Configurar mediante `dotnet user-secrets` en `apps/api/src/PagaTo.Api`:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<CONEXION_ROTADA_DE_DESARROLLO>"
dotnet user-secrets set "Jwt:SigningKey" "<CLAVE_LOCAL_LARGA_Y_ALEATORIA>"
```

No copiar valores reales al repositorio, README, `.env` o capturas.

## Arranque

Terminal 1:

```powershell
cd apps/api
dotnet run --project src/PagaTo.Api
```

Terminal 2:

```powershell
cd apps/web
npm install
npm run dev
```

Web: `http://localhost:5173`. API: `http://localhost:5147`. Swagger: `http://localhost:5147/swagger`.

## Verificación

```powershell
cd apps/web
npm run typecheck
npm run lint
npm run build

cd ../api
dotnet build PagaTo.sln
dotnet test PagaTo.sln
```

La migración inicial fue aplicada el 17 de agosto de 2026 únicamente a Neon `development` (`br-proud-thunder-axh0lhtb`). Verifica siempre el destino antes de futuras migraciones.
