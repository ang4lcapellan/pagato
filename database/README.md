# Base de datos de PagaTo

La base de datos usa PostgreSQL 18 en Neon y mantiene el modelo de la aplicación dentro del esquema dedicado `pagato`. Esto evita colisiones con tablas históricas o administradas por proveedores de autenticación.

## Archivos

- `migrations/0001_initial_schema.sql`: esquema inicial, restricciones, índices, RLS, vistas y categorías predeterminadas.
- `verify.sql`: comprobaciones de solo lectura después de aplicar la migración.
- `security_smoke_test.sql`: prueba transaccional de aislamiento entre usuarios; siempre termina en `ROLLBACK`.
- `schema.md`: explicación del modelo, relaciones y decisiones de integridad.

## Entornos

- Git: `codex/develop`.
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

La aplicación debe conectarse con un rol de ejecución sin privilegios de propietario. La creación de ese rol y la integración con el proveedor de autenticación se realizarán cuando se defina Auth.js, Better Auth o Neon Auth.

## Aplicación

1. Seleccionar la rama `development` en Neon.
2. Ejecutar `migrations/0001_initial_schema.sql` como una transacción.
3. Ejecutar `verify.sql`.
4. Ejecutar `security_smoke_test.sql` y confirmar que termina correctamente en `ROLLBACK`.
5. Confirmar que todas las tablas están en el esquema `pagato` y que RLS está habilitado.
6. No copiar la cadena de conexión a archivos versionados, logs o conversaciones.
