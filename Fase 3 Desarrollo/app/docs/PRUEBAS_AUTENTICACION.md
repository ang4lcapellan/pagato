# Cómo probar autenticación y perfil financiero

## 1. Abrir la aplicación

En VS Code abre la terminal dentro de `Fase 3 Desarrollo/app` (donde está `package.json`):

```powershell
npm run dev
```

Abre <http://localhost:3000>. Mantén la terminal abierta. Para detenerla: `Ctrl+C`.
Si el servidor ya está encendido, no necesitas iniciar otro.
En una instalación nueva ejecuta primero `npm install` y configura `.env.local` con credenciales de **development**. No compartas este archivo.

## 2. Probar tu perfil

1. Inicia sesión o registra una cuenta de prueba.
2. Al abrir `/dashboard` deben aparecer **Perfil conectado**, tu nombre y tu correo.
3. Verifica las preferencias iniciales: DOP, Español, tema según dispositivo, America/Santo_Domingo y DD/MM/YYYY.
4. Verifica **10 categorías: 2 de ingresos y 8 de gastos**.
5. Recarga varias veces. No deben duplicarse el perfil, las preferencias ni las categorías.
6. Cierra sesión y vuelve a entrar. Debe ser el mismo perfil.
7. Opcionalmente registra otra cuenta de prueba con un correo que controles. Debe tener otro perfil y categorías propias.

El tema y el idioma se guardan como preferencias; su aplicación completa y edición corresponden al futuro módulo Preferencias. El panel actual es una pantalla de preparación, no el dashboard financiero final de Fase 2.

### Dónde ver los registros

En tu conexión de Neon **development**, abre el esquema `pagato`:

- `app_users`: un perfil por usuario. `auth_subject` referencia el ID de `neon_auth.user`.
- `user_preferences`: una fila cuyo `user_id` corresponde al `id` de `app_users`.
- `categories`: diez filas iniciales con ese mismo `user_id`.

Los módulos financieros deben usar `app_users.id`, **no** el ID de Auth como clave financiera.
No copies contraseñas, tokens o cookies en estas tablas.

Consulta de comprobación (solo lectura), sustituyendo el correo por el de tu cuenta de prueba:

```sql
SELECT p.id, p.auth_subject, p.display_name,
       prefs.base_currency, prefs.locale, prefs.theme,
       (SELECT count(*) FROM pagato.categories c
        WHERE c.user_id = p.id AND c.is_default) AS categorias_iniciales
FROM pagato.app_users p
JOIN pagato.user_preferences prefs ON prefs.user_id = p.id
WHERE p.email = 'tu-correo-de-prueba@example.com';
```

## 3. Probar móvil desde tu computadora

No necesitas instalar una extensión:

1. Abre <http://localhost:3000> en Chrome o Edge.
2. Presiona `F12` y después `Ctrl+Shift+M` para activar la vista de dispositivos.
3. Selecciona **Responsive** y usa **390 × 844**, la medida base del diseño de Fase 2.
4. Prueba también 320 px, 768 px y escritorio (1440 px).
5. Recorre registro, inicio de sesión, recuperación y el panel. Comprueba que no haya desplazamiento horizontal, textos cortados ni botones solapados.
6. Prueba los botones de mostrar contraseña, las casillas y los mensajes de validación. Navega también con `Tab`.
7. Para volver a escritorio presiona otra vez `Ctrl+Shift+M`.

Referencia visual: `Fase 2 Diseño/PagaTo_Manual_Linea_Grafica_Mint_Flow.pdf`, pantallas SVG de `Mint Flow UI/Mobile` y logo de `Brand/Logo_Billetera_Amable.svg`.
Se usa Manrope, paleta Mint Flow, margen móvil de 20 px, tarjetas de 16 px, superficies destacadas de 24 px y controles táctiles de al menos 44 px. Las pantallas de autenticación adaptan esa línea gráfica; no hay maquetas específicas de autenticación en el paquete SVG actual.

### Probar en un teléfono real

La emulación no sustituye comprobar teclado, navegador y tacto reales.
Para ver el layout por Wi-Fi, conecta PC y teléfono a la misma red privada y abre en el teléfono la dirección **Network** que muestra `npm run dev` (por ejemplo, `http://IP-DE-TU-PC:3000`). `localhost` en el teléfono apunta al teléfono, no a la computadora.

**Importante:** ver la interfaz por una IP HTTP no garantiza que funcione la sesión. Las cookies seguras y los orígenes autorizados del servicio de autenticación pueden requerir HTTPS. Para validar registro, sesión, recuperación y PWA en el teléfono, utiliza un entorno de pruebas HTTPS con `APP_URL` y el origen permitido correctamente configurados. No desactives cookies seguras, CORS ni el firewall para hacer pasar la prueba; no uses credenciales reales por HTTP en la red. Ese despliegue/configuración no forma parte de este cambio.

## 4. Lista funcional

| Prueba | Resultado esperado |
| --- | --- |
| Formulario vacío o correo inválido | Errores comprensibles, sin crear usuario |
| Contraseñas diferentes | Mensaje de validación |
| Correo ya registrado | No crea un segundo usuario |
| Iniciar sesión | Abre el panel y prepara el perfil |
| Recargar / volver a entrar | Conserva el mismo perfil y preferencias |
| Ventana de incógnito → `/dashboard` | Redirige al inicio de sesión |
| Cerrar sesión → abrir `/dashboard` | Solicita iniciar sesión otra vez |
| Recuperar contraseña | Llega el correo; el enlace permite definir otra contraseña |
| Contraseña restablecida | La nueva permite entrar; la anterior no |
| Enlace inválido/vencido/reutilizado | No permite restablecer la contraseña |

La entrega real del correo y el recorrido completo de recuperación siguen pendientes de validación manual. También queda pendiente mejorar el manejo de fallos del servicio al cerrar sesión: una redirección por sí sola no prueba que se haya invalidado la sesión.

## 5. Pruebas automatizadas

Desde `Fase 3 Desarrollo/app`:

```powershell
npm run check
npm run test:e2e
npm run test:db
npm run build
```

- `check`: lint, TypeScript y pruebas unitarias del perfil, sesión requerida, errores e interfaz.
- `test:e2e`: navegación, protección sin sesión, tamaños móviles, Manrope, botones táctiles y movimiento reducido. No crea cuentas ni prueba correo real.
- `test:db`: requiere Node.js 24 y una cuenta de prueba con sesión activa; está limitado al endpoint development actual. Prueba el SQL real, duplicados, preservación de preferencias/categorías desactivadas, perfiles suspendidos/eliminados e identidades inválidas. Los cambios de verificación se revierten con rollback. No cambia tablas de Auth ni permisos. Si existen varias cuentas activas, define `PAGATO_TEST_AUTH_SUBJECT` con el ID de Auth de tu cuenta de prueba.
- `build`: comprueba la compilación de producción; no despliega la aplicación.

## Seguridad y alcance

La identidad viene únicamente de la sesión del servidor; además se verifica en la base que esa sesión pertenezca al usuario, no haya vencido y no esté bloqueada. Nunca se vinculan perfiles por un correo enviado desde el navegador. La creación usa una única transacción y restricciones únicas existentes; no requiere migración.

Se mantienen las credenciales actuales de desarrollo. **La conexión sigue utilizando `neondb_owner`, que omite RLS**; esta implementación valida sesión y pertenencia explícitamente, pero no sustituye el aislamiento de un rol restringido. Antes de producción hay que acordar y configurar ese rol; no se crearon roles, permisos ni funciones `SECURITY DEFINER` en este cambio. Referencia: [driver y RLS de Neon](https://neon.com/docs/serverless/serverless-driver#using-transactions-with-jwt-self-verification).
