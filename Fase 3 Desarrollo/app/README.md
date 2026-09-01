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
- `npm run db:generate`: genera migraciones de Drizzle.
- `npm run db:migrate`: aplica migraciones usando `DIRECT_URL`.

La migración SQL ubicada en `../database/migrations/0001_initial_schema.sql` sigue siendo la fuente de verdad inicial. El esquema Drizzle se incorporará por módulos para evitar divergencias.
