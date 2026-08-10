# Estrategia de migraciones EF Core

Fecha: 2026-08-10

## Decisión

Se adopta la opción C: construir una migración inicial limpia con EF Core y aplicarla exclusivamente sobre Neon `development`.

## Motivo

La auditoría verificó que `development` no contiene el esquema de PagaTo ni datos financieros. Una migración baseline que finja objetos preexistentes dejaría una base inconsistente. EF Core puede convertirse desde el inicio en la fuente versionada de verdad sin destruir trabajo ni migrar datos.

## Tratamiento de usuarios e Identity

La tabla conceptual `users` no se creará de forma separada. `ApplicationUser : IdentityUser<Guid>` será la raíz de identidad y propiedad financiera, mapeada dentro del esquema `pagato`. `UserProfile` permanecerá como relación uno a uno. Como la base está vacía, no existe información que convertir o preservar.

## Procedimiento seguro

1. Modelar entidades y configuraciones equivalentes al diseño aprobado.
2. Generar una migración inicial revisable en Git.
3. Ejecutar pruebas contra PostgreSQL efímero con Testcontainers.
4. Confirmar programáticamente que el destino manual es `development`.
5. Aplicar la migración únicamente a `development` usando secretos locales.
6. Comparar el esquema resultante con el modelo esperado.
7. Mantener la rama padre sin cambios hasta una aprobación explícita.

## Reglas

- No usar `EnsureCreated` para evolución normal.
- No ejecutar migraciones automáticamente al iniciar la API.
- No guardar connection strings ni claves JWT en archivos versionados.
- No ejecutar `DROP`, `TRUNCATE` ni cambios destructivos automáticos.
- El script SQL local continúa ignorado y funciona solo como referencia histórica.

## Consecuencia

Las diferencias futuras del esquema se expresarán mediante migraciones EF Core pequeñas y revisables. Los índices parciales, índices de expresión y triggers que se conserven requerirán SQL específico de PostgreSQL dentro de una migración y pruebas de integración.
