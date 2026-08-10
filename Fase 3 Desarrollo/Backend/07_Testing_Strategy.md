# Estrategia de pruebas

- Unitarias: reglas de cantidades, transferencias, presupuestos, categorías y validadores.
- Integración: `WebApplicationFactory` con PostgreSQL efímero mediante Testcontainers.
- Neon nunca se usa en tests automáticos.

Resultado 2026-08-10: 6 pruebas unitarias superadas. Las 2 pruebas de integración están implementadas, pero no se ejecutaron correctamente porque Docker Desktop no estaba activo (`docker_engine` no disponible). Deben repetirse al iniciar Docker.

```powershell
cd apps/api
dotnet test PagaTo.sln
```

