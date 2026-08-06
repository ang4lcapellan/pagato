# PagaTo’

Interfaz web navegable para una plataforma de finanzas personales. Esta etapa transforma los conceptos de Google Stitch en una aplicación React coherente con el PagaTo Design Language v2.0.

## Estado

Base visual web implementada con datos locales simulados. No existen backend, autenticación real, API, persistencia financiera ni sincronización offline.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, React Hook Form, Zod, Recharts, clsx, tailwind-merge y date-fns.

## Estructura

- `apps/web`: aplicación visual.
- `Fase 1 Analisis`: documentación previa del producto.
- `Fase 2 Diseño`: PDL v2.0 y exportaciones originales de Stitch, solo referencia.
- `Fase 3 Desarrollo`: auditoría y documentación de implementación.

## Requisitos e instalación

Node.js 20 o superior y npm 10 o superior.

```bash
cd apps/web
npm install
npm run dev
```

Verificación:

```bash
npm run typecheck
npm run lint
npm run build
```

## Rutas

Acceso: `/login`, `/register`, `/forgot-password`, `/verify-email`, `/reset-password`.

Aplicación: `/app/dashboard`, `/app/transactions`, `/app/transactions/new`, `/app/accounts`, `/app/accounts/new`, `/app/budgets`, `/app/reports`, `/app/settings`.

El botón de login redirige al Dashboard mediante un flujo simulado. No se transmite ni persiste la contraseña.

## Mocks y temas

Los datos de usuario, cuentas, transacciones, presupuestos, reportes, notificaciones, sesiones y preferencias viven en `apps/web/src/mocks`. Los temas `light`, `dark` y `system` usan tokens semánticos y la preferencia se conserva en `localStorage`. También se conserva localmente el control visual de privacidad de importes.

## Referencia visual

La fuente de verdad es `Fase 2 Diseño/PagaTo_Design_System_PDL_v2.0.pdf`. Stitch es referencia secundaria. Los originales no se modificaron.

## Limitaciones

- Datos únicamente demostrativos.
- Sin i18n completa; la interfaz activa está en español.
- Google Fonts requiere red; existen fallbacks locales seguros.
- El bundle incluye Recharts en el paquete inicial y debe dividirse por rutas cuando el producto crezca.
- Los importes son `number` solo en mocks; backend y contratos deberán usar precisión decimal.

## Próximos pasos

Revisión del propietario, pruebas automatizadas de componentes, extracción completa de traducciones, code-splitting y diseño de contratos API antes de integrar el backend.
