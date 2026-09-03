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
- `npm run test:accounts:db`: integración de cuentas en development; comprueba permisos, saldos y estados con rollback (Node.js 24 y sesión activa).
- `npm run test:categories:db`: integración de categorías en development; comprueba duplicados, aislamiento, estados e historial con rollback (Node.js 24 y sesión activa).
- `npm run test:transactions:db`: 17 escenarios de movimientos y saldos con rollback (Node.js 24 y sesión activa).
- `npm run test:transactions:concurrency`: 4 escenarios de solicitudes simultáneas; usa fixtures temporales propios y los retira al terminar.
- `npm run test:budgets:db`: 12 escenarios de presupuestos, consumo, períodos y aislamiento con rollback (Node.js 24 y sesión activa).
- `npm run test:budgets:ui`: prueba visual aislada del módulo a 1440, 390 y 320 px; sin escrituras en Neon.
- `npm run test:plans:db`: 12 escenarios de presupuestos mensuales y copia con rollback (Node.js 24 y sesión activa).
- `npm run test:plans:ui`: creación, distribución y copia mensual a 1440, 390 y 320 px con acciones simuladas.
- `npm run db:generate`: genera migraciones de Drizzle.
- `npm run db:migrate`: aplica migraciones usando `DIRECT_URL`.

Las migraciones SQL de `../database/migrations/` son la fuente de verdad: primero `0001_initial_schema.sql` y después `0002_monthly_budget_plans.sql`. No se aplican mediante los comandos de Drizzle anteriores. Consulta `../database/README.md` para validarlas y aplicarlas. El esquema Drizzle se incorporará por módulos para evitar divergencias.

## Autenticación y perfil financiero

Al entrar al panel con una sesión válida se crea automáticamente el perfil en `pagato.app_users`, una fila de preferencias y diez categorías iniciales. Las visitas posteriores no duplican registros ni sobrescriben preferencias. El enlace usa el ID de Auth, no el correo. Las cuentas creadas antes de esta integración se preparan al volver a abrir el panel.

Separación del módulo:

- Backend: `src/modules/users/server/` (verificación de sesión y transacción de base de datos).
- Frontend: `src/modules/users/components/` (resumen visual) y `src/app/dashboard/page.tsx` (pantalla).
- Tipos de datos: `src/modules/users/types.ts`; no incluye tokens ni contraseñas.

Consulta [la guía de pruebas de escritorio y móvil](docs/PRUEBAS_AUTENTICACION.md).

## Cuentas financieras (PG-03)

En `/accounts` puedes crear, consultar, editar, archivar y reactivar cuentas. Incluye siete tipos, seis monedas, saldos iniciales precisos, búsqueda y totales separados por moneda. El saldo actual se consulta desde `pagato.account_balances`; los datos se guardan en `pagato.accounts` asociados al perfil autenticado.

- Frontend: `src/modules/accounts/components/`.
- Backend: `src/modules/accounts/server/` (acciones y consultas parametrizadas).
- Validación y cálculos: `src/modules/accounts/model.ts`.
- Ruta protegida: `src/app/accounts/`; navegación compartida: `src/components/app-shell.tsx`.

La interfaz sigue las pantallas de cuentas Mint Flow de Fase 2, con navegación lateral en escritorio e inferior en móvil, logo oficial, tipografía Manrope y movimiento reducido. Consulta [la guía funcional y de pruebas](docs/CUENTAS_FINANCIERAS.md).

**Solo desarrollo:** la conexión actual usa `neondb_owner` y no está aislada por RLS. No se modificaron permisos. Antes de producción se necesita un rol limitado y revisar el manejo de errores de cierre de sesión y la recuperación por correo.

## Categorías (PG-12)

En `/categories`, o en Ajustes → Categorías, puedes consultar las categorías predeterminadas, crear categorías personalizadas de ingreso o gasto, editar nombre/icono/color y desactivarlas o reactivarlas. Hay búsqueda y filtros por estado y origen. El tipo se fija al crear la categoría; no se elimina el historial. Las diez categorías iniciales se preparan con el perfil, sin duplicarse ni sobrescribir personalizaciones posteriores.

- Frontend: `src/modules/categories/components/`.
- Backend: `src/modules/categories/server/`.
- Tipos y validación: `src/modules/categories/model.ts`.
- Rutas protegidas: `src/app/categories/` y el acceso de navegación en `src/app/settings/`.
- Base de datos: tabla existente `pagato.categories`; no requiere otra migración.

Consulta [la guía de categorías y pruebas](docs/CATEGORIAS.md). Las preferencias generales de Ajustes siguen siendo un trabajo separado.

## Transacciones (PG-01, PG-02, PG-07, PG-10 y PG-11)

En `/transactions`, accesible desde Movimientos, puedes registrar ingresos, gastos y transferencias entre cuentas propias; consultar detalle; editar y eliminar lógicamente. El historial tiene búsqueda, filtros por fecha/cuenta/categoría/tipo, paginación y resúmenes separados por moneda. Los balances se recalculan desde los movimientos vigentes.

- Frontend: `src/modules/transactions/components/`.
- Backend: `src/modules/transactions/server/`.
- Validación, fechas y filtros: `src/modules/transactions/model.ts`.
- Ruta protegida: `src/app/transactions/`.
- Base de datos: `pagato.transactions` y `pagato.account_balances`, sin nuevas migraciones.

Las operaciones comprueban propiedad y referencias activas, usan importes decimales exactos, impiden duplicados por reenvío y protegen las ediciones con una versión. Las transferencias no ejecutan operaciones bancarias ni se contabilizan como ingresos/gastos. Consulta [la guía funcional, de seguridad y de pruebas](docs/TRANSACCIONES.md).

## Presupuestos (PG-13)

En `/budgets` puedes crear un presupuesto mensual con límite total e ingreso estimado opcional, distribuirlo por categorías y copiar su configuración a otro mes. El detalle incluye una barra de distribución, controles deslizantes, ahorro proyectado y progreso real por categoría. Los límites anteriores se conservan en Límites individuales. En móvil está accesible desde Inicio y Ajustes, manteniendo los cuatro destinos inferiores de Fase 2.

- Frontend mensual: `src/modules/budgets/plans/components/`; límites individuales: `src/modules/budgets/components/`.
- Backend mensual: `src/modules/budgets/plans/actions.ts` y `repository.ts`; individual: `src/modules/budgets/server/`.
- Tipos, validación y presentación monetaria exacta: `src/modules/budgets/plans/model.ts` y `src/modules/budgets/model.ts`.
- Ruta protegida: `src/app/budgets/`.
- Base de datos: `pagato.budget_plans`, `pagato.budgets` y agregados del historial; migración `0002_monthly_budget_plans.sql`.

El consumo mensual incluye todos los gastos no eliminados de la moneda y el período, incluso fuera de las categorías asignadas. Las tarjetas de categorías muestran su propio consumo. La copia no duplica transacciones. Se protegen los reenvíos, las versiones y el límite total de la distribución. Consulta [la guía de presupuestos y pruebas](docs/PRESUPUESTOS.md).
