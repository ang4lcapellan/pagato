# Aplicación PagaTo'

Aplicación web responsive construida con Next.js, TypeScript, Tailwind CSS, Drizzle ORM, Neon PostgreSQL y Neon Auth.

## Desarrollo local

1. Copia `.env.example` como `.env.local`.
2. Completa únicamente credenciales de la rama `development` de Neon.
3. Ejecuta `npm install`.
4. Ejecuta `npm run dev`.
5. Abre `http://localhost:3000`.

Nunca agregues `.env.local` al repositorio. La aplicación usa `DATABASE_URL` pooled durante la ejecución y `DIRECT_URL` solamente para migraciones.

## Comandos

- `npm run dev`: servidor de desarrollo.
- `npm run check`: lint, tipos y pruebas unitarias.
- `npm run build`: compilación de producción.
- `npm run test:e2e`: pruebas responsive con Playwright.
- `npm run test:db`: comprobación del perfil en development con rollback (requiere Node.js 24 y una sesión de prueba activa).
- `npm run db:generate`: genera migraciones de Drizzle.
- `npm run db:migrate`: aplica migraciones usando `DIRECT_URL`.

La migración SQL ubicada en `../database/migrations/0001_initial_schema.sql` sigue siendo la fuente de verdad inicial. El esquema Drizzle se incorporará por módulos para evitar divergencias.

## Autenticación y perfil financiero

Al entrar al panel con una sesión válida se crea automáticamente el perfil en `pagato.app_users`, una fila de preferencias y diez categorías iniciales. Las visitas posteriores no duplican registros ni sobrescriben preferencias. El enlace usa el ID de Auth, no el correo. Las cuentas creadas antes de esta integración se preparan al volver a abrir el panel.

Separación del módulo:

- Backend: `src/modules/users/server/` (verificación de sesión y transacción de base de datos).
- Frontend: `src/modules/users/components/` (resumen visual) y `src/app/dashboard/page.tsx` (pantalla).
- Tipos de datos: `src/modules/users/types.ts`; no incluye tokens ni contraseñas.

Consulta [la guía de pruebas de escritorio y móvil](docs/PRUEBAS_AUTENTICACION.md).

**Solo desarrollo:** la conexión actual usa `neondb_owner` y no está aislada por RLS. No se modificaron permisos. Antes de producción se necesita un rol limitado y revisar el manejo de errores de cierre de sesión y la recuperación por correo.
