# Contratos y flujos integrados

## Autenticación

`POST /api/v1/auth/register`, `login`, `refresh`, `logout` y `GET /me`.

El frontend conserva el access token solamente en memoria. `login`, `register` y `refresh` reciben la cookie rotatoria `pagato_refresh` como `HttpOnly`. Las solicitudes incluyen credenciales y, ante un 401 no perteneciente a Auth, intentan una sola renovación antes de fallar.

## Finanzas

- Accounts: listar y crear desde la web.
- Categories: listar para formularios y reportes.
- Transactions: listar y crear ingresos/gastos.
- Transfers: crear con cuenta origen y destino distintas; no se agregan a ingresos/gastos globales.
- Budgets: listar y calcular estado consumido desde la respuesta de la API.

## Errores y carga

El cliente central traduce Problem Details a `ApiError`. Las páginas muestran carga, estado vacío o error recuperable. Las mutaciones invalidan las consultas afectadas.

## Pendientes de contrato

- Actualización del perfil.
- Exportación CSV.
- Filtros/paginación server-side.
- Endpoint agregado de dashboard para reducir transferencia de datos cuando crezca el volumen.
