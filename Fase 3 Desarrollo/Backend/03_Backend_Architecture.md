# Arquitectura backend

La solución usa Clean Architecture pragmática en un monolito modular:

- `PagaTo.Domain`: entidades, enums y reglas esenciales sin dependencias de infraestructura.
- `PagaTo.Application`: contratos HTTP y validadores de casos de uso.
- `PagaTo.Infrastructure`: Identity, EF Core, Npgsql, mapeos y migraciones.
- `PagaTo.Api`: controllers, autenticación, autorización, Problem Details, OpenAPI y composición.

No se incorporaron MediatR, repositorio genérico, Unit of Work adicional, AutoMapper ni event bus. `DbContext` representa la unidad transaccional y los controllers filtran siempre por el usuario autenticado.

El esquema PostgreSQL es `pagato`. EF Core Migrations es la fuente de verdad futura. `current_balance` y `amount_spent` no se persisten; se calculan desde movimientos completados. Las transferencias usan un encabezado financiero y un detalle 1:1 dentro de una transacción PostgreSQL.

