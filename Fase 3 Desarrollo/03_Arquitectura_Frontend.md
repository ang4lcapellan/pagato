# Arquitectura frontend

Aplicación Vite de una sola página organizada por responsabilidades prácticas:

- `app`: providers, router y composición raíz.
- `components/ui`: primitivos visuales accesibles.
- `components/layout`: shell, sidebar, top bar y encabezados.
- `components/finance`: tabla financiera reutilizable.
- `routes`: pantallas de acceso y aplicación.
- `mocks`: datos demostrativos reemplazables.
- `lib`: formateo y utilidades.
- `styles`: tokens semánticos, temas y reglas globales.

TanStack Query está configurado como frontera futura para datos remotos, pero no se simula una API. React Hook Form + Zod se usa donde la validación aporta a la demostración. El estado de tema y privacidad es local al proveedor de UI.

El PDL manda sobre Stitch. Tailwind es la base de composición y las variables CSS proporcionan temas sin colores directos en componentes. No se añadieron Redux, librerías visuales ni abstracciones de dominio prematuras.
