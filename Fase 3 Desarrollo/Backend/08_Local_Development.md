# Desarrollo local

Requisitos: .NET SDK 10, Docker Desktop para integration tests y acceso a Neon `development` para pruebas manuales.

Después de rotar la credencial Neon, configurar sin copiar valores a archivos:

```powershell
cd apps/api
dotnet user-secrets set --project src/PagaTo.Api "ConnectionStrings:DefaultConnection" "<NEON DEVELOPMENT CONNECTION STRING>"
dotnet user-secrets set --project src/PagaTo.Api "Jwt:SigningKey" "<STRONG RANDOM KEY>"
dotnet restore
dotnet build PagaTo.sln
dotnet run --project src/PagaTo.Api
```

API HTTP: `http://localhost:5147`. HTTPS: `https://localhost:7192`. Swagger en Development: `/swagger`. Health: `/health`.

Las migraciones no se aplican al iniciar la API. Ejecutarlas manualmente solo tras confirmar que el destino es Neon `development`.

