# Endpoints API v1

| Área | Endpoints |
|---|---|
| Auth | `POST /api/v1/auth/register`, `login`, `refresh`, `logout`; `GET /api/v1/auth/me` |
| Accounts | `GET/POST /api/v1/accounts`, `GET/PUT/DELETE /api/v1/accounts/{id}` |
| Categories | `GET/POST /api/v1/categories`, `PUT /api/v1/categories/{id}` |
| Transactions | `GET/POST /api/v1/transactions`, `GET/PUT/DELETE /api/v1/transactions/{id}` |
| Transfers | `POST /api/v1/transfers` |
| Budgets | `GET/POST /api/v1/budgets`, `PUT/DELETE /api/v1/budgets/{id}` |
| Health | `GET /health` |

Todos los endpoints financieros requieren Bearer token. `UserId` se obtiene del claim `NameIdentifier` y todas las consultas aplican ownership. Las categorías del sistema son visibles, pero solo las personales pueden editarse por su propietario.

