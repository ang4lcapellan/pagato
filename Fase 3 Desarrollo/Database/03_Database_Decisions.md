# Decisiones de base de datos

## DB-001 — Esquema lógico `pagato`

**Estado:** propuesta para aprobación.

Se agrupan los objetos del producto en un esquema propio sin crear la base de datos. Esto evita colisiones con objetos de Identity o extensiones futuras y funciona en servicios administrados.

## DB-002 — UUID generado por aplicación

**Estado:** propuesta para aprobación.

Todas las PK usan UUID sin default. Web/móvil/backend podrán generar identificadores antes de persistir, útil para idempotencia y offline futuro. No se requiere `pgcrypto`. Riesgo: toda inserción debe suministrar ID; se controla desde la futura aplicación.

## DB-003 — `VARCHAR + CHECK` en lugar de ENUM PostgreSQL

**Estado:** propuesta para aprobación.

Los catálogos cerrados se validan con `CHECK`. Es más sencillo añadir, reemplazar o retirar valores mediante migraciones y evita acoplar el modelo C# al ciclo de vida de ENUM nativo. Desventaja: ocupa algo más y no ofrece un tipo reutilizable; se acepta por flexibilidad.

## DB-004 — Precisión monetaria

**Estado:** propuesta para aprobación.

Todos los importes usan `NUMERIC(18,2)`. Dos decimales cubren DOP/USD/EUR del MVP. Si después se necesitan criptoactivos o cálculos de intereses con mayor escala, se evaluará `NUMERIC(19,4)` para cálculos o columnas específicas; no se cambia preventivamente.

## DB-005 — Saldo actual derivado

**Estado:** propuesta para aprobación.

`accounts.current_balance` no existe. El saldo se deriva del inicial y movimientos vigentes. Evita inconsistencias entre ledger y snapshot. Si las mediciones muestran necesidad, se añadirá una proyección reconstruible con mecanismo explícito de conciliación.

## DB-006 — Gasto consumido derivado

**Estado:** propuesta para aprobación.

`budgets.amount_spent` no existe. Se calcula desde gastos completados, no eliminados, dentro del periodo/categoría/moneda. Esto evita actualizar presupuesto y transacción en operaciones separadas.

## DB-007 — Transferencia normalizada 1:1

**Estado:** propuesta para aprobación.

`transactions` guarda datos comunes y `transfers` solo origen/destino. `transaction_id` es PK/FK. Un trigger diferido verifica que toda transacción Transfer tenga detalle y que ningún otro tipo lo tenga.

Ventajas:

- una sola fuente para importe, moneda, fecha y estado;
- edición y auditoría coherentes;
- las transferencias no se confunden con ingreso/gasto;
- operación atómica natural.

Costos:

- consulta de transferencias requiere join;
- EF Core necesita configuración 1:1 y transacción explícita;
- la creación debe confirmar encabezado y detalle juntos.

Se descarta duplicar todos los campos en `transfers` porque permitiría divergencias.

## DB-008 — Estrategia temporal

**Estado:** propuesta para aprobación.

`created_at`, `updated_at`, `deleted_at` y `transaction_date` usan `TIMESTAMPTZ`. PostgreSQL conserva el instante; la aplicación transforma usando `user_profiles.time_zone` para periodos financieros. `initial_balance_date` y límites de presupuesto usan `DATE` porque representan un día/periodo, no un instante.

La aplicación enviará instantes UTC y zonas IANA. No se usará la zona del servidor como regla de negocio.

## DB-009 — Soft delete limitado

**Estado:** propuesta para aprobación.

Solo accounts y transactions tienen `deleted_at` por impacto histórico y recuperación. Categories y budgets usan estados. No se aplica soft delete indiscriminado para evitar filtros implícitos y unicidad compleja.

## DB-010 — Tags incluidos

**Estado:** propuesta para aprobación.

Tags aportan filtros transversales y requieren solo dos tablas pequeñas. La PK compuesta evita asignaciones duplicadas; FKs compuestas preservan propietario.

## DB-011 — Receipts como metadatos

**Estado:** propuesta para aprobación.

Se modela como 0..1 por transacción y no almacena binarios. El archivo real vivirá en object storage futuro. No se implementa carga ni proveedor.

## DB-012 — Integridad de propietario

**Estado:** propuesta para aprobación.

Se usan FKs compuestas para accounts, transfers y tags. Un trigger valida categorías del sistema o del mismo usuario. Esta defensa no reemplaza autorización ni filtros del backend.

## DB-013 — Sin RLS inicial

**Estado:** pendiente.

Row-Level Security puede ser útil, pero requiere decidir identidad de conexión, pooling y establecimiento seguro del usuario por sesión/transacción. Se pospone hasta diseñar infraestructura de acceso; activarla sin esa decisión podría ofrecer falsa seguridad.

## Tablas futuras no implementadas

- Tablas oficiales de ASP.NET Core Identity, roles, claims, tokens y sesiones.
- `credit_card_details`, estados de cuenta, cuotas, intereses y cashback.
- préstamos, calendarios y amortización.
- inversiones, posiciones y valoración.
- metas, ahorros y deudas especializadas.
- planes de suscripción, pagos y familias.
- exchange rates y proveedores bancarios.
- outbox/idempotency/sync cursors para offline.
- historial de auditoría inmutable.
- proyecciones de balance y reporting.

## Preguntas pendientes

1. ¿`NUMERIC(18,2)` es suficiente para todas las monedas previstas o se aprobará escala 4 desde el inicio?
2. ¿Se permite más de un comprobante por transacción en una versión futura?
3. ¿Los presupuestos generales (`category_id NULL`) pueden coexistir con presupuestos por categoría en el mismo periodo?
4. ¿Se bloquearán presupuestos activos superpuestos o solo duplicados exactos?
5. ¿Una transacción `Cancelled` conserva el importe original para auditoría? La propuesta es sí.
6. ¿Qué estrategia de RLS se usará con el futuro pool de conexiones?
7. ¿La tabla `users` se reemplazará completamente por Identity o se mantendrá como perfil de dominio enlazado?
