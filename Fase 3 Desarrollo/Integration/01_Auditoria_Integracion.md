# Auditoría de integración

Fecha: 2026-08-16

## Estado encontrado

- Web React/Vite completa visualmente, pero sus páginas financieras consumían `src/mocks/data.ts`.
- API ASP.NET Core 10 con Auth, Accounts, Categories, Transactions, Transfers y Budgets.
- Contratos JSON sin serialización explícita de enums como texto.
- Refresh token devuelto previamente al cliente; se requería evitar almacenamiento accesible desde JavaScript.
- Migración inicial de EF Core existente.
- Neon `development` verificado vacío; no se alteró.

## Decisiones

- `VITE_API_BASE_URL` define la URL pública de la API, sin secretos.
- TanStack Query administra lectura, caché e invalidación de datos remotos.
- Access token solo en memoria y refresh token en cookie `HttpOnly`, `SameSite=Strict`.
- Los enums se serializan como strings para estabilizar el contrato TypeScript/C#.
- Dashboard y reportes agregan temporalmente los recursos existentes en cliente; un endpoint resumido podrá evitar sobreconsulta cuando haya volumen real.
- La conexión de Neon queda pausada hasta confirmar rotación de la credencial comprometida.

## Riesgos

- Neon aún no tiene esquema y la aplicación no puede completar un flujo real hasta migrarlo.
- Docker Desktop no está ejecutándose; Testcontainers no pudo validarse.
- El bundle web incluye Recharts y supera 500 kB; conviene lazy loading por ruta.
- Exportación CSV y edición de perfil todavía no tienen endpoint/UI funcional.
