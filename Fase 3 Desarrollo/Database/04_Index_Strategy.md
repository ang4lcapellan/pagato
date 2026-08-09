# Estrategia de índices

Los índices responden a consultas esperadas del MVP. No se añaden índices para cada FK o columna; deberán validarse con `EXPLAIN (ANALYZE, BUFFERS)` cuando existan datos representativos.

| Índice | Objetivo |
|---|---|
| `uq_users_email_normalized` | Login/búsqueda conceptual y unicidad case-insensitive mediante valor normalizado |
| `ix_accounts_user_active` | Listar cuentas activas propias excluyendo soft delete |
| `uq_categories_system_name_type` | Evitar categorías predeterminadas duplicadas por nombre/tipo |
| `uq_categories_user_name_type` | Evitar duplicados dentro del catálogo de un usuario |
| `ix_categories_user_type` | Listar categorías personales por tipo; también recupera sistema con consulta separada |
| `ix_transactions_user_date` | Timeline, dashboard y exportaciones por usuario/fecha |
| `ix_transactions_user_account_date` | Movimientos y saldo derivado de una cuenta |
| `ix_transactions_user_category_date` | Presupuestos y reportes por categoría |
| `ix_budgets_user_dates` | Buscar presupuestos que cubren o cruzan un periodo |
| `uq_budgets_exact_active_period` | Evitar duplicado activo exacto, incluso en presupuesto general |
| `uq_tags_user_name` | Nombre de tag reutilizable y único por usuario |
| `ix_transaction_tags_tag` | Buscar transacciones asignadas a un tag |
| `uq_receipts_transaction` | Garantizar máximo un comprobante por transacción y acelerar join |

## Transferencias

La fecha de transferencia está normalizada en `transactions.transaction_date`. Por eso no existe un índice duplicado `(user_id, transfer_date)` en `transfers`. La consulta usa:

```sql
SELECT ...
FROM pagato.transactions tr
JOIN pagato.transfers tf ON tf.transaction_id = tr.id
WHERE tr.user_id = :user_id
  AND tr.transaction_type = 'Transfer'
  AND tr.deleted_at IS NULL
ORDER BY tr.transaction_date DESC;
```

`ix_transactions_user_date` satisface el filtro y orden principal. `transfers.transaction_id` es PK y satisface el join. `ix_transfers_user_transaction` conserva acceso por propietario sin duplicar la fecha.

## Índices parciales

Accounts y transactions excluyen filas con `deleted_at`. Esto reduce tamaño y coincide con las lecturas normales. Consultas administrativas de elementos eliminados podrán usar PK u otros planes menos frecuentes.

## Índices no creados

- `status` aislado: baja cardinalidad.
- `currency_code` aislado: baja cardinalidad y normalmente combinado con usuario/periodo.
- texto de descripción/merchant: búsqueda full-text/trigram se pospone hasta existir necesidad; no se habilita `pg_trgm`.
- todos los campos de auditoría: no hay consulta del MVP que lo justifique.
- índices de reporting adicionales: se decidirán con métricas reales.

## Riesgos y revisión futura

- El cálculo de saldos puede requerir índices adicionales por `status` o una proyección al crecer.
- Los presupuestos superpuestos no pueden impedirse con un índice simple; una exclusion constraint exigiría diseño adicional y posiblemente `btree_gist`.
- Los nombres case-insensitive usan índices de expresión `lower(name)`; EF Core necesitará SQL específico de PostgreSQL.
- Debe revisarse crecimiento y bloat de índices sobre transactions antes de ajustar autovacuum o particionar. Particionado no es necesario para el MVP.
