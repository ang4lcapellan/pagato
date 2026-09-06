# PWA y experiencia multidispositivo · PG-09

PagaTo usa una sola aplicación Next.js responsive, instalable en los navegadores compatibles. No se crea una aplicación nativa ni se duplica el backend. La autenticación y la base de datos Neon existentes siguen siendo necesarias para consultar o modificar información financiera.

## Organización

| Ubicación | Responsabilidad |
| --- | --- |
| `src/app/manifest.ts` | Identidad estable, alcance `/`, inicio protegido `/dashboard`, iconos y modo independiente. |
| `src/modules/pwa/components/` | Instalación, estado de conectividad, ayuda y actualización voluntaria; integrado en Ajustes. |
| `src/modules/pwa/worker.js` | Fuente del service worker con caché estrictamente pública. |
| `scripts/prepare-pwa.mjs` | Genera los iconos a partir del logo original y `/public/sw.js` con versión derivada del contenido. |
| `public/pwa/` | Pantalla offline pública, CSS, JavaScript, Manrope con licencia e iconos instalables. |
| `src/app/pwa.css` | Interfaz de instalación y avisos, con la paleta clara/negro suave, verde y movimiento reducido. |
| `next.config.ts` | Cabeceras de actualización del worker y CSP restringida para los recursos PWA. |

La navegación inferior conserva los cinco accesos: Inicio, Movimientos, Cuentas, Presupuestos y Ajustes. Se habilita `viewport-fit=cover` para respetar las áreas seguras del dispositivo. No se limita el zoom. El estado de instalación es local a cada navegador/dispositivo, no una preferencia financiera del usuario.

## Ejecutar y probar

Desde `Fase 3 Desarrollo/app`, en una terminal de VS Code:

```powershell
npm run build
npm start
```

Si el servidor de desarrollo ocupa el puerto 3000, detén **esa terminal** con `Ctrl+C` antes de iniciar producción. Abre `http://localhost:3000`, inicia sesión y ve a **Ajustes → Instalar aplicación**. El manifiesto inicia la PWA en `/dashboard`; si no existe una sesión válida se solicita iniciar sesión.

`npm run dev` mantiene el desarrollo habitual con recarga rápida. Genera los archivos públicos, pero **no registra un nuevo service worker en desarrollo**. Para probar el ciclo PWA completo se usa `npm run build` y `npm start`; no es suficiente ver el manifiesto desde el servidor de desarrollo. Un worker ya instalado en el mismo origen puede seguir presente: para una prueba limpia usa otro perfil de navegador o, solo para desarrollo, Application → Service Workers → Unregister.

### Android, iOS y escritorio

- **Android / Chrome:** abre la URL HTTPS; en Ajustes pulsa Instalar PagaTo si el navegador ofrece la acción, o usa el menú ⋮ → Instalar aplicación / Añadir a pantalla de inicio.
- **iPhone / iPad:** abre la URL HTTPS en Safari → Compartir → Añadir a pantalla de inicio. Si aparece Abrir como app web, actívalo. El botón programático de instalación no existe en todos los navegadores.
- **Escritorio:** Chrome o Edge ofrecen instalación desde la barra de direcciones o el menú. Safari compatible en macOS ofrece Archivo → Añadir al Dock.

El navegador decide cuándo ofrecer la instalación; no se fuerza un cuadro automáticamente ni se muestra un botón que no pueda funcionar. La aplicación sigue siendo utilizable como web si no se permite instalar.

**HTTPS es necesario fuera de localhost/loopback.** Una dirección `http://192.168...` o `http://10...` en el teléfono permite revisar el diseño responsive, pero no constituye una prueba válida de instalación/service worker. Para probar en dispositivos reales se necesita un despliegue HTTPS o un entorno de pruebas con certificado confiable; el origen debe estar autorizado también en Neon Auth y en la configuración de la aplicación. No se ha publicado ni cambiado la configuración de autenticación con este módulo. No uses una URL de túnel sin controlar su acceso si contiene información personal.

### Sin conexión

1. Abre la aplicación online y comprueba en Ajustes que la pantalla sin conexión está preparada.
2. En DevTools → Application → Cache Storage, `pagato-public-<versión>` debe contener **exactamente**:
   - `/pwa/offline.html`
   - `/pwa/offline.css`
   - `/pwa/offline.js`
   - `/pwa/manrope-latin.woff2`
   - `/brand/pagato-mark.svg`
3. Desconecta la red o elige Offline en DevTools → Network. Una pantalla ya abierta muestra un aviso sin destruir los valores que escribiste; sus datos presentes están en memoria, no se guardan en la caché PWA.
4. Recarga una página: debe mostrarse la pantalla informativa sin saldos, correos, sesiones ni movimientos. APIs, RSC y acciones no reciben esta página como respuesta.
5. Reconecta y pulsa Volver a intentar. No se reenvían automáticamente formularios ni operaciones anteriores.

La primera visita debe realizarse online. La pantalla offline sigue el idioma del navegador (español/inglés) y el tema del sistema, no las preferencias privadas guardadas en la base de datos. La pantalla completa de la aplicación conserva las preferencias del usuario cuando está online.

### Actualizaciones

`prebuild` calcula una versión a partir de código y recursos públicos. No lee `.env`, registros ni datos de usuarios. Cada despliegue debe ejecutar `npm run build` y publicar también `public/`; no ejecutes únicamente `next build` saltándote la preparación. El worker generado no se edita ni se versiona directamente.

- La nueva versión descarga por completo sus cinco archivos públicos sin cookies, con un tiempo de espera limitado. Si alguno falla, la instalación se rechaza y la versión anterior sigue activa.
- Una nueva versión espera a que el usuario pulse Actualizar y confirme que guardó sus formularios; alternativamente se activa cuando se cierran todas las pestañas anteriores, según el ciclo normal del navegador.
- Más tarde oculta el aviso, pero la acción continúa disponible en Ajustes.
- Solo se recarga automáticamente la pestaña que confirmó la actualización. Las demás conservan sus formularios y reciben un aviso.
- Al activar se eliminan únicamente cachés anteriores con el prefijo `pagato-public-`, nunca otras cachés del origen.

Para probarlo manualmente: abre producción, deja una pestaña con un formulario sin enviar, modifica un texto público del proyecto, compila/reinicia producción y pulsa Buscar actualizaciones en Ajustes. Confirma desde otra pestaña y verifica que el borrador permanezca en la primera. El navegador puede descartar almacenamiento por espacio o políticas de privacidad; si lo hace, vuelve a abrir la aplicación online.

## Seguridad

No se usan estrategias cache-first/stale-while-revalidate sobre páginas privadas. No se almacenan respuestas de Neon/Auth, HTML privado, RSC, APIs, Server Actions ni POST en Cache Storage. Las navegaciones de documentos se solicitan a la red con `cache: no-store` y solo reciben la pantalla neutral ante un fallo de red, no para ocultar errores HTTP 401/403/500. No hay cola de escrituras, Background Sync, IndexedDB ni localStorage financiero.

El caché del service worker no sustituye las cookies seguras de autenticación que ya necesita la aplicación. Tampoco reemplaza la protección de rutas ni los controles de propietario en el backend. No hay migración nueva ni cambios en Neon para este módulo.

## Verificación automatizada

```powershell
npm run check
npm run build
npm run test:pwa
npm run test:preferences:ui
npm run test:e2e
```

`test:pwa` usa un servidor aislado y datos ficticios, sin conectarse a Neon: comprueba el worker real en Chromium, precaché sin cookies, exclusión de respuestas privadas, ausencia de reenvíos POST, offline a 320/390/1440 px en claro/oscuro, actualización voluntaria, conservación de borradores en otra pestaña, versión fallida e iconos. Las pruebas unitarias verifican además confirmación, instalación explícita, desarrollo/HTTPS y traducciones.

La automatización no sustituye una instalación manual en Android/iOS físicos con HTTPS y el proveedor de autenticación configurado para ese origen.

También se puede comprobar la integración real con Next.js (sin iniciar sesión ni escribir en la base de datos): ejecuta `npm start -- --port 3100` después de compilar y, en otra terminal, `npm run test:pwa:production`. La prueba verifica cabeceras, iconos, manifiesto, protección del inicio y desconexión/reintento en un contexto de navegador limpio. `PWA_TEST_ORIGIN` permite cambiar el origen de prueba, restringido a localhost/127.0.0.1.

## Referencias

- [Manifiesto de Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest).
- [Requisitos y compatibilidad de instalación PWA — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
- [Activación de actualizaciones con skipWaiting — MDN](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting).
