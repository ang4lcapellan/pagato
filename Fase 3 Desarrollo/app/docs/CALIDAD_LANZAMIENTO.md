# Calidad previa al lanzamiento

Esta revisión cubre la lista visual entregada sin duplicar controles existentes.

## Implementado

- Política de privacidad y términos enlazados desde la portada y el registro.
- Imágenes actuales pequeñas, locales y optimizadas; los elementos decorativos usan `alt=""` y no existen imágenes informativas sin texto alternativo.
- Pruebas responsive a 320 px, Pixel y iPhone, además de una matriz automatizada para Chromium, Firefox y WebKit de escritorio.
- Favicon, iconos PWA y manifest configurados con la marca oficial.
- Títulos y descripciones específicos; Open Graph, Twitter Card, imagen social, canonical público, robots y sitemap.
- Formularios con validación cliente/servidor, estados de espera, éxito y error.
- Verificación E2E de enlaces públicos y rutas privadas conocidas.
- Página 404 adaptada a la línea visual.
- Medición propia de Core Web Vitals y visitas, únicamente con consentimiento. La ruta se normaliza y nunca incluye identificadores, correos, importes o contenido financiero.
- Banner de privacidad con elección entre cookies necesarias y medición opcional.
- Escaneo de secretos, variables exclusivas de servidor, CSP, límites y demás controles descritos en `SEGURIDAD.md`.
- No se añadieron enlaces de redes sociales, según el alcance solicitado.

## Pendiente de información externa

- Sustituir `SUPPORT_EMAIL` por un buzón real y vigilado.
- Completar identidad legal, jurisdicción, períodos de retención y proveedor de alojamiento; después solicitar revisión jurídica de ambos documentos.
- Conectar los registros `[telemetry]` del alojamiento a un panel o sistema de observabilidad si se desea conservar y agregar métricas. PagaTo no activa un proveedor de rastreo externo por defecto.
- Ejecutar una auditoría Lighthouse sobre la URL HTTPS final; el resultado local no representa red, CDN ni servidor de producción.
- Revisar periódicamente el aviso moderado de `esbuild@0.18.20`, transitivo de la herramienta `drizzle-kit`. El auditor no reporta vulnerabilidades altas o críticas y su arreglo automático actual exige un cambio incompatible; esa dependencia no se ejecuta en el servidor de producción.

## Verificación

Ejecuta `npm run check`, `npm run test:e2e`, `npm run build` y `npm run security:check`. Playwright requiere instalar Chromium y WebKit con `npx playwright install chromium webkit`. Firefox se ejecuta también en CI; en Windows puede forzarse con `$env:PLAYWRIGHT_FIREFOX="1"` después de instalar Firefox y el runtime de Visual C++ requerido.
