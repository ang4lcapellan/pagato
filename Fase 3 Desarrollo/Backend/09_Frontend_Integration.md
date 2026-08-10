# Integración frontend

El frontend existente permanece intacto y continúa usando mocks. La integración futura se hará mediante `apps/web/src/services`, en este orden: Auth, Accounts, Categories, Transactions y Budgets.

Los componentes visuales no deben realizar `fetch` directamente. TanStack Query consumirá servicios tipados y centralizará estados de carga, error y renovación de sesión. La primera integración queda pendiente hasta rotar la credencial Neon y completar las pruebas de autenticación.

