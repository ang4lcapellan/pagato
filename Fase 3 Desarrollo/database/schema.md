# Diseño relacional

## Principios

- Cada dato financiero pertenece a un usuario.
- La identidad externa se separa del perfil financiero.
- Los montos usan `numeric(19,4)`; nunca punto flotante.
- Las transferencias se representan como una sola transacción con origen y destino.
- Las eliminaciones de movimientos son lógicas para conservar trazabilidad.
- Los balances y consumos de presupuesto se calculan desde movimientos válidos.
- Las claves foráneas compuestas impiden relacionar recursos de usuarios distintos.
- Row-Level Security agrega una segunda barrera además de la autorización del servidor.

## Entidades

### app_users

Perfil mínimo utilizado por los módulos financieros. `auth_subject` enlaza el usuario con Neon Auth. La tabla no almacena contraseñas ni tokens.

### user_preferences

Preferencias de tema, idioma, moneda principal, zona horaria y formato de fecha. Existe una fila por usuario.

### accounts

Cuentas de efectivo, banco, ahorro, tarjeta, billetera, inversión u otro tipo. El saldo se deriva de `opening_balance` y las transacciones.

### categories

Categorías de ingreso o gasto. Todas pertenecen a un usuario, incluyendo las predeterminadas que se copian al crear su perfil. Esto simplifica autorización, personalización e historial.

### transactions

Registro único para ingresos, gastos y transferencias:

- gasto: cuenta origen y monto origen;
- ingreso: cuenta destino y monto destino;
- transferencia: ambas cuentas y ambos montos.

Los dos montos permiten transferencias entre cuentas con monedas diferentes sin perder los valores originales. `client_request_id` permite idempotencia ante doble envío.

### tags y transaction_tags

Etiquetas opcionales y su relación muchos-a-muchos con transacciones.

### budget_plans

Presupuesto mensual padre: nombre, moneda, límite total, ingreso estimado opcional, fechas del mes, estado y versión. Existe como máximo uno activo por usuario, moneda y mes. Las claves de solicitud y el control de versión permiten guardar o copiar de forma segura sin duplicar una operación ni sobrescribir cambios recientes.

Su consumo real suma todos los gastos vigentes del mes y la moneda, incluidos los que no tienen asignación. El ingreso estimado se usa solo para proyecciones, no crea ingresos financieros. Copiar crea una nueva configuración mensual, nunca transacciones.

### budgets

Límite de gasto por categoría, moneda y período. El consumo se calcula desde gastos no eliminados.
Las fechas del movimiento se interpretan en la zona horaria configurada por el usuario.

`plan_id` enlaza opcionalmente el límite con un presupuesto mensual. Una clave compuesta exige el mismo propietario, moneda y período; cada categoría aparece una sola vez por plan. La suma de asignaciones activas se valida atómicamente en el backend y no puede superar el límite mensual. Retirar una asignación la archiva y no modifica gastos.

Los límites anteriores mantienen `plan_id IS NULL`, accesibles como límites individuales. No se reasignan automáticamente ni se pierden al aplicar la segunda migración.

## Relaciones

```text
app_users
├── user_preferences
├── accounts
├── categories
├── transactions
│   ├── source_account -> accounts
│   ├── destination_account -> accounts
│   └── category -> categories
├── tags
│   └── transaction_tags -> transactions
├── budget_plans
│   └── budgets (plan_id no nulo)
│       └── category -> categories
└── budgets individuales (plan_id nulo)
    └── category -> categories
```

## Vistas

- `account_balances`: saldo actual derivado por cuenta.
- `budget_progress`: monto gastado, disponible y porcentaje utilizado.

Las vistas usan `security_invoker`, por lo que respetan las políticas RLS de las tablas consultadas.

## Decisiones pendientes

- Completar el mapeo del esquema en Drizzle; las migraciones SQL son actualmente la fuente de verdad.
- Estrategia de conversión entre monedas y fuente de tasas.
- Política definitiva de retención y eliminación de usuarios.
- Rol PostgreSQL de runtime y permisos mínimos después de elegir el mecanismo de despliegue.
