# Auditoría del esquema Neon

Fecha: 2026-08-10

## Alcance

Se compararon la documentación de `Fase 3 Desarrollo/Database`, el script local `pagato_initial_schema.sql` y la base `neondb` del proyecto Neon `PagaTo`.

## Entorno verificado

- Proyecto Neon: `PagaTo` (`dawn-mode-06716679`).
- Rama de trabajo: `development` (`br-proud-thunder-axh0lhtb`).
- Rama padre: `br-damp-night-axmaprua`.
- Base: `neondb`.
- La consulta fue de solo lectura y se dirigió explícitamente a `development`.

## Resultado real

La base contiene únicamente el esquema `public`. No existen tablas de aplicación, columnas, claves, constraints, índices ni seed data. Solo se observó una función auxiliar de inspección provista por la integración.

## Diseño esperado según SQL y documentación

El diseño local propone el esquema `pagato` y las tablas `users`, `user_profiles`, `accounts`, `categories`, `transactions`, `transfers`, `budgets`, `tags`, `transaction_tags` y `receipts`, además de reglas de integridad, índices y categorías predeterminadas.

## Diferencias

| Elemento | Diseño local | Neon development | Evaluación |
|---|---|---|---|
| Esquema `pagato` | Definido | Ausente | Pendiente de crear mediante EF Core |
| Tablas MVP | 10 tablas conceptuales | Ninguna | No existe esquema cargado |
| PK, FK y checks | Definidos | Ninguno | Pendientes |
| Índices | Definidos | Ninguno | Pendientes |
| Categorías seed | 17 previstas | Ninguna | Pendientes |
| Datos financieros reales | No previstos | Ninguno | Sin riesgo de migración de datos |

## Conclusión

La afirmación previa de que el esquema estaba cargado no coincide con el estado verificable de `development`. No se recreará ni borrará nada. Debido a que no hay datos ni objetos existentes, la estrategia más mantenible es crear el esquema desde migraciones de EF Core en `development`, conservando el SQL como especificación de referencia y verificando equivalencia.

La rama padre no fue modificada. Antes de cualquier operación estructural se deberá comprobar nuevamente el identificador de rama.
