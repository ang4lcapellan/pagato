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
- `npm run test:motion:ui`: transiciones, ventanas, foco y movimiento reducido en escritorio y móvil, sin escrituras en la base de datos.
- `npm run db:generate`: genera migraciones de Drizzle.
- `npm run db:migrate`: aplica migraciones usando `DIRECT_URL`.

Las migraciones SQL de `../database/migrations/` son la fuente de verdad: `0001_initial_schema.sql`, `0002_monthly_budget_plans.sql` y `0003_preferences_number_format.sql`, en ese orden. No se aplican mediante los comandos de Drizzle anteriores. Consulta `../database/README.md` para validarlas y aplicarlas. El esquema Drizzle se incorporará por módulos para evitar divergencias.

## Preferencias (PG-08)

Disponible en **Ajustes** (`/settings`): tema claro/oscuro/sistema, español/inglés, moneda principal, zona horaria, formatos independientes de fecha y número, y restauración de valores predeterminados con confirmación. Se guardan en `pagato.user_preferences` para cada usuario y se aplican al guardar. La moneda principal cambia la presentación y los valores predeterminados, nunca convierte ni modifica registros financieros.

- Frontend: `src/modules/preferences/components/`, diccionarios de textos y `src/app/preferences.css`.
- Backend: `src/modules/preferences/server/`, con sesión vigente, propietario y control de versión.
- `npm run db:preferences:validate`: valida la migración y revierte; `npm run db:preferences:apply`: la aplica únicamente en development.
- `npm run test:preferences:db`: seguridad y preservación de datos en Neon, con rollback.
- `npm run test:preferences:ui`: escritorio/móvil, SSR, idioma, temas, formatos, guardado y restauración con acciones simuladas.

Consulta [la guía de preferencias y pruebas](docs/PREFERENCIAS.md).

## Autenticación y perfil financiero

La interfaz utiliza un [sistema compartido de animaciones](docs/ANIMACIONES.md), con tiempos moderados, cierre suave de ventanas y respeto por movimiento reducido.

Al entrar al panel con una sesión válida se crea automáticamente el perfil en `pagato.app_users`, una fila de preferencias y diez categorías iniciales. Las visitas posteriores no duplican registros ni sobrescriben preferencias. El enlace usa el ID de Auth, no el correo. Las cuentas creadas antes de esta integración se preparan al volver a abrir el panel.

Separación del módulo:

- Backend: `src/modules/users/server/` (verificación de sesión y transacción de base de datos).
- Frontend: el resumen inicial de perfil se conserva en `src/modules/users/components/`; Inicio ahora utiliza el módulo Dashboard descrito más abajo.
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

En `/budgets` puedes crear un presupuesto mensual con límite total e ingreso estimado opcional, distribuirlo por categorías y copiar su configuración a otro mes. El detalle incluye una barra de distribución, controles deslizantes, ahorro proyectado y progreso real por categoría. Los límites anteriores se conservan en Límites individuales. En móvil tiene acceso directo en la navegación inferior, junto a Inicio, Movimientos, Cuentas y Ajustes.

- Frontend mensual: `src/modules/budgets/plans/components/`; límites individuales: `src/modules/budgets/components/`.
- Backend mensual: `src/modules/budgets/plans/actions.ts` y `repository.ts`; individual: `src/modules/budgets/server/`.
- Tipos, validación y presentación monetaria exacta: `src/modules/budgets/plans/model.ts` y `src/modules/budgets/model.ts`.
- Ruta protegida: `src/app/budgets/`.
- Base de datos: `pagato.budget_plans`, `pagato.budgets` y agregados del historial; migración `0002_monthly_budget_plans.sql`.

El consumo mensual incluye todos los gastos no eliminados de la moneda y el período, incluso fuera de las categorías asignadas. Las tarjetas de categorías muestran su propio consumo. La copia no duplica transacciones. Se protegen los reenvíos, las versiones y el límite total de la distribución. Consulta [la guía de presupuestos y pruebas](docs/PRESUPUESTOS.md).

## Inicio / Dashboard (PG-06)

`/dashboard` es el inicio privado después de autenticarse. Muestra el balance actual de las cuentas activas, ingresos, gastos, balance neto, ahorro y tasa del período; evolución, distribución por categorías, cinco movimientos recientes y hasta cuatro presupuestos. Incluye filtros mensuales, anuales o personalizados y una moneda por consulta, sin conversión implícita.

- Frontend: `src/modules/dashboard/components/` (pantalla Mint Flow, gráficos accesibles, estados y filtros).
- Backend: `src/modules/dashboard/server/` (consulta de una sola instantánea, sesión/propietario verificados y opciones de registro).
- Validación y cálculos exactos: `src/modules/dashboard/model.ts`.
- Ruta protegida y estados: `src/app/dashboard/`. No necesita migración nueva.

Desde Inicio se pueden registrar movimientos, abrir su detalle, editar y eliminar mediante las mismas operaciones seguras del módulo Transacciones. Los datos se actualizan después de guardar. Consulta [las reglas de cálculo y pruebas del Dashboard](docs/DASHBOARD.md).

## PWA y experiencia multidispositivo (PG-09)

PagaTo es una aplicación web instalable en navegadores compatibles de Android, iOS y escritorio. **Ajustes → Instalar aplicación** ofrece instalación cuando está disponible, ayuda por plataforma y búsqueda de actualizaciones. El service worker se habilita en producción (`npm run build` y `npm start`), con iconos derivados del logo original, pantalla sin conexión y actualización confirmada por el usuario. Solo se guardan cinco recursos públicos; no se cachean datos financieros, sesiones ni respuestas privadas ni se encolan operaciones sin conexión. La navegación móvil incluye cinco destinos y respeta las áreas seguras del dispositivo.

Consulta [instalación, seguridad, estructura y pruebas PWA](docs/PWA.md). En teléfonos reales se necesita HTTPS para verificar la instalación completa.

## Seguridad previa al despliegue

La aplicación aplica validación estricta, sesiones verificadas en el servidor, límites de intentos, honeypot, CSP con nonce, cabeceras defensivas, límites de cuerpo, TLS obligatorio y consultas parametrizadas con tiempo máximo. Ejecuta `npm run security:check` para revisar secretos y dependencias; el repositorio también incluye comprobaciones automáticas y Dependabot.

Antes de publicar todavía se debe crear y probar en una rama de Neon un rol de ejecución sin `BYPASSRLS`, configurar HTTPS y observabilidad en el proveedor, y sustituir el límite de intentos en memoria por uno distribuido si habrá varias instancias. Consulta [la auditoría y lista de controles](docs/SEGURIDAD.md).

## Calidad de lanzamiento y privacidad

La portada y las rutas públicas incluyen metadatos descriptivos, Open Graph, Twitter Card, imagen social, favicon, sitemap, robots y una página 404 propia. El registro enlaza la Política de privacidad y los Términos. La medición de rendimiento y visitas es propia, optativa y se activa únicamente después del consentimiento; solo registra nombre/valor de Core Web Vitals y una ruta normalizada.

Configura `SUPPORT_EMAIL` con un buzón real antes de publicar y completa los datos legales del responsable y del alojamiento. Consulta [la lista de calidad y pendientes externos](docs/CALIDAD_LANZAMIENTO.md).
