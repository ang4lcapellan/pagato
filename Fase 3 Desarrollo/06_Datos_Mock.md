# Datos simulados

`apps/web/src/mocks/data.ts` contiene usuario, cuentas, transacciones, presupuestos, flujo de caja, notificaciones, sesiones y preferencias.

Reglas:

- No hay datos personales reales.
- No se incrustan colecciones extensas en componentes.
- Los identificadores son locales y explícitamente demostrativos.
- Las transferencias tienen tipo propio.
- El crédito disponible no integra el balance total.
- Los valores usan `number` únicamente para UI; el backend deberá usar `decimal` y PostgreSQL `numeric`.

La sustitución futura será mediante servicios HTTP consumidos por TanStack Query, conservando los componentes de presentación.
