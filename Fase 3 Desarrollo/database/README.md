# Base de datos de PagaTo

La base de datos usa PostgreSQL 18 en Neon y mantiene el modelo de la aplicación dentro del esquema dedicado `pagato`. Esto evita colisiones con tablas históricas o administradas por proveedores de autenticación.

## Archivos

- `migrations/0001_initial_schema.sql`: esquema inicial, restricciones, índices, RLS, vistas y categorías predeterminadas.
- `migrations/0002_monthly_budget_plans.sql`: presupuesto mensual padre y vínculo opcional de los límites por categoría, sin reasignar datos anteriores.
- `verify.sql`: comprobaciones de solo lectura después de aplicar la migración.
- `security_smoke_test.sql`: prueba transaccional de aislamiento entre usuarios; siempre termina en `ROLLBACK`.
- `schema.md`: explicación del modelo, relaciones y decisiones de integridad.

## Entornos

- Git: `develop`.
- Neon: `development`.
- Base de datos: `neondb`.
- Esquema de aplicación: `pagato`.

La rama `main` de Neon no debe recibir cambios durante el desarrollo. Las migraciones se prueban primero en `development` y solo se promueven después de una revisión y aprobación explícita.

## Conexiones

La aplicación debe usar el endpoint pooled de Neon mediante `DATABASE_URL`. Las migraciones deben usar el endpoint directo mediante `DIRECT_URL`.

Los valores reales se guardan en `.env.local` o en el gestor de secretos del proveedor. El repositorio solo contiene `.env.example` con marcadores ficticios.

## Contexto de seguridad

Las tablas tienen Row-Level Security. Cada transacción de aplicación debe establecer el usuario autenticado de forma local:

```sql
SELECT set_config('pagato.user_id', $1, true);
```

El tercer argumento en `true` limita el valor a la transacción actual, evitando que el contexto de un usuario se reutilice en una conexión pooled.

La aplicación integra Neon Auth y verifica la sesión en el servidor. La conexión de desarrollo todavía usa `neondb_owner`, que omite RLS; por eso cada consulta aplica también filtros explícitos de identidad y propiedad. Antes de producción se debe configurar un rol de ejecución sin privilegios de propietario. Estas migraciones no crean ese rol.

## Aplicación

1. Seleccionar la rama `development` en Neon.
2. Ejecutar `migrations/0001_initial_schema.sql` como una transacción.
3. Ejecutar `migrations/0002_monthly_budget_plans.sql` como una transacción.
4. Ejecutar `migrations/0003_preferences_number_format.sql`. Después ejecutar `verify.sql` para comprobar el esquema inicial y revisar también las restricciones, índices y RLS de `budget_plans` y el nuevo formato numérico de preferencias.
5. Ejecutar `security_smoke_test.sql` y confirmar que termina correctamente en `ROLLBACK`.
6. Confirmar que todas las tablas están en el esquema `pagato` y que RLS está habilitado.
7. No copiar la cadena de conexión a archivos versionados, logs o conversaciones.

### Actualizar una base de desarrollo existente

Desde `../app`, con Node.js 24 y `DIRECT_URL` en `.env.local`:

```text
node scripts/migrate-budget-plans.mjs
node scripts/migrate-budget-plans.mjs --apply
```

El primer comando valida la segunda migración en una transacción que revierte obligatoriamente. El segundo la aplica. El script restringe el destino al endpoint de desarrollo del proyecto, comprueba que se conserven las filas anteriores y detecta si ya se aplicó. Para otro entorno se debe revisar y ejecutar el SQL mediante su procedimiento de despliegue autorizado; no quitar la protección para apuntar a producción.

Después se puede ejecutar `npm run test:plans:db` desde la aplicación. Esta suite requiere una sesión de prueba activa y revierte sus datos temporales.

Para PG-08, desde `../app`: `npm run db:preferences:validate` comprueba la migración 0003 con rollback y `npm run db:preferences:apply` la aplica. El destino está limitado a development. `npm run test:preferences:db` comprueba guardado por usuario, sesión válida, versiones obsoletas y preservación de cuentas/transacciones; revierte los cambios de prueba. El campo `number_format` acepta `comma-dot` (1,234.56, predeterminado) o `dot-comma` (1.234,56).
