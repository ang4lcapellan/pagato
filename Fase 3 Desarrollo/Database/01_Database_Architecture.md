# Arquitectura de base de datos de PagaTo’

Estado: borrador para revisión

Motor: PostgreSQL

Alcance: MVP, sin backend ni conexión a una instancia real

## Objetivo

El esquema `pagato` modela información financiera personal con aislamiento por usuario, integridad relacional y mínima duplicación. Es compatible con PostgreSQL estándar en local, Docker, Neon y Azure Database for PostgreSQL. No usa extensiones ni funciones propietarias de un proveedor.

## Convenciones

- Tablas y columnas en `snake_case`.
- UUID como clave pública, generado por la futura aplicación. El SQL no usa `gen_random_uuid()` ni requiere `pgcrypto`.
- Dinero con `NUMERIC(18,2)`. Nunca `REAL`, `FLOAT` ni `DOUBLE PRECISION`.
- Monedas mediante códigos ISO 4217 de tres letras mayúsculas.
- Instantes técnicos y financieros mediante `TIMESTAMPTZ`.
- Periodos financieros mediante `DATE`.
- `created_at` y `updated_at` tienen valor inicial del servidor; la aplicación futura actualizará `updated_at` explícitamente.
- Clasificaciones mediante `VARCHAR + CHECK`, no ENUM nativo, para simplificar evolución y mapeo con EF Core.

## Tablas

### `users`

Usuario conceptual mínimo utilizado como raíz de relaciones. `email_normalized` es único y se espera en mayúsculas. Esta tabla no reproduce ASP.NET Core Identity. Cuando se implemente Identity deberá reemplazarse o mapearse a su tabla oficial, conservando el UUID utilizado como propietario.

### `user_profiles`

Relación 1:1 con usuario. Contiene nombre visible, idioma, moneda base, país y zona IANA. Valores iniciales: `es`, `DOP`, `DO`, `America/Santo_Domingo`.

### `accounts`

Cuenta financiera propiedad de un usuario. Contiene saldo inicial, moneda, fecha de apertura lógica, metadatos visuales y estado. `deleted_at` implementa eliminación lógica.

`current_balance` no se guarda. Se deriva de:

```text
initial_balance
+ ingresos Completed no eliminados
- gastos Completed no eliminados
+/- lados de transferencias Completed no eliminadas
```

Una proyección materializada podrá añadirse después de medir rendimiento, pero no será la fuente de verdad.

### `categories`

Categorías de ingreso o gasto. Las categorías del sistema tienen `user_id NULL`; las personales tienen propietario obligatorio. Un `CHECK` garantiza esa regla. Índices únicos parciales evitan duplicados por nombre y tipo dentro del ámbito correcto.

### `transactions`

Encabezado financiero común para ingresos, gastos y transferencias. Mantiene importe positivo, moneda, instante, descripción, estado y auditoría. En ingresos/gastos `account_id` es obligatorio. En transferencias es nulo porque las dos cuentas viven en `transfers`.

Las categorías son opcionales. Triggers pequeños validan que una categoría personal pertenezca al mismo usuario, que esté activa, que su tipo sea compatible y que cambios posteriores de propietario/tipo no invaliden referencias existentes.

### `transfers`

Extensión 1:1 de una transacción de tipo `Transfer`. Usa `transaction_id` como PK y FK; solo añade cuenta de origen y destino. Importe, moneda, fecha, estado y descripción permanecen en `transactions`, evitando duplicación.

La futura aplicación deberá crear el encabezado y el detalle en una única transacción de base de datos. Un constraint trigger diferido permite insertar ambos registros en cualquier orden dentro de esa transacción y valida la relación al confirmar.

Las transferencias internas no se agregan como ingreso o gasto global. Para calcular saldos, disminuyen origen y aumentan destino por el mismo importe.

### `budgets`

Presupuesto general o por categoría de gasto. Admite periodo mensual o personalizado y estados `Active`, `Paused`, `Completed`.

`amount_spent` no se guarda. Se deriva de transacciones `Expense`, `Completed`, no eliminadas, dentro del periodo, moneda y categoría aplicables. Así no se crean dos fuentes de verdad.

### `tags` y `transaction_tags`

Etiquetas reutilizables por usuario y relación muchos-a-muchos con transacciones. Se incluyen porque añaden filtrado útil con una estructura pequeña. Las FKs compuestas impiden asociar tags y transacciones de propietarios distintos.

### `receipts`

Solo metadatos de un comprobante opcional por transacción. No almacena binarios. `storage_key` será una referencia opaca a object storage futuro.

## Relaciones y eliminación

- `users` 1:1 `user_profiles`.
- `users` 1:N `accounts`, `categories`, `transactions`, `budgets`, `tags`.
- `accounts` 1:N `transactions` para ingresos/gastos.
- `transactions` 1:0..1 `transfers`.
- `accounts` 1:N `transfers` como origen y destino.
- `categories` 1:N `transactions` y `budgets`.
- `transactions` N:M `tags` mediante `transaction_tags`.
- `transactions` 1:0..1 `receipts`.

Se usa `RESTRICT` para preservar historial financiero. `CASCADE` aparece solo en la tabla asociativa `transaction_tags`, donde borrar el enlace dependiente es seguro. Accounts y transactions usan soft delete.

## Aislamiento de usuario

Las entidades privadas contienen `user_id`. Las FKs compuestas en cuentas, transferencias y tags hacen cumplir propietario en la base. Categorías requieren trigger porque las del sistema no tienen propietario. Esto complementa, pero no reemplaza, la autorización futura: el backend deberá obtener `UserId` de claims y nunca confiar en uno enviado por el cliente.

No se define Row-Level Security en el esquema inicial porque la estrategia de roles y pooling de conexiones aún no está aprobada. Puede añadirse como defensa adicional cuando exista arquitectura de despliegue.

## Compatibilidad futura con EF Core

- Las claves y relaciones son explícitas.
- Los valores clasificados pueden mapearse como enums C# convertidos a texto.
- Las relaciones compuestas deberán configurarse con Fluent API.
- Los índices parciales y de expresión requerirán SQL de migración específico de PostgreSQL.
- Los triggers deben representarse como SQL de migración y cubrirse con pruebas de integración.
- La tabla conceptual `users` deberá reconciliarse con ASP.NET Core Identity antes de la primera migración real.
