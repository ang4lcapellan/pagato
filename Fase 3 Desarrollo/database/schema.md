# Diseño relacional inicial

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

Perfil mínimo utilizado por los módulos financieros. `auth_subject` enlaza el usuario con el proveedor de autenticación elegido posteriormente. La tabla no almacena contraseñas ni tokens.

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

### budgets

Límite de gasto por categoría, moneda y período. El consumo se calcula desde gastos no eliminados.
Las fechas del movimiento se interpretan en la zona horaria configurada por el usuario.

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
└── budgets
    └── category -> categories
```

## Vistas

- `account_balances`: saldo actual derivado por cuenta.
- `budget_progress`: monto gastado, disponible y porcentaje utilizado.

Las vistas usan `security_invoker`, por lo que respetan las políticas RLS de las tablas consultadas.

## Decisiones pendientes

- Proveedor de autenticación: Auth.js, Better Auth o Neon Auth.
- ORM de aplicación: Prisma o Drizzle.
- Estrategia de conversión entre monedas y fuente de tasas.
- Política definitiva de retención y eliminación de usuarios.
- Rol PostgreSQL de runtime y permisos mínimos después de elegir el mecanismo de despliegue.
