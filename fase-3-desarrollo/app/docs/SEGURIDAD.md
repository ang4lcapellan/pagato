# Seguridad de PagaTo'

Esta revisión convierte la lista previa al lanzamiento en controles verificables. No sustituye una auditoría independiente.

## Controles implementados

- Los secretos solo se leen en módulos `server-only`; `.env*` está ignorado salvo `.env.example`.
- El script `npm run security:secrets` examina archivos versionados sin imprimir valores detectados.
- PostgreSQL usa consultas parametrizadas y cada repositorio vuelve a verificar usuario, sesión activa y propiedad.
- Las tablas financieras tienen RLS habilitado y forzado, claves foráneas compuestas por propietario y pruebas SQL de aislamiento.
- Todos los Server Actions financieros exigen sesión y validan entradas con Zod; `user_id` nunca se acepta del navegador.
- Las escrituras usan control de versión, bloqueos o claves de idempotencia para impedir cambios obsoletos y dobles envíos.
- Neon Auth administra el hash de contraseñas y las cookies firmadas; la aplicación exige un secreto de al menos 32 caracteres.
- Registro, acceso y recuperación incluyen honeypot y límites por identidad e IP. El limitador local es una protección adicional por instancia.
- Los Server Actions aceptan como máximo 64 KB y el proxy de Auth rechaza cuerpos declarados mayores.
- Una CSP con nonce protege scripts. También se envían HSTS en producción, `nosniff`, política de referencia, permisos restringidos y protección contra frames.
- `APP_URL` debe usar HTTPS en producción; la conexión Neon debe exigir TLS y usar el endpoint pooled en producción.
- Las solicitudes a PostgreSQL tienen un límite de 15 segundos y registran solo duración/estado de consultas lentas o fallidas, nunca SQL ni datos.
- React escapa contenido mostrado y la aplicación no usa HTML sin sanitizar.
- No existe carga de archivos; cuando se añada deberá incluir lista de MIME, tamaño, extensión, almacenamiento privado y análisis de contenido.
- Dependabot y el workflow de seguridad revisan dependencias, secretos, lint, tipos y tests semanalmente y en cambios de código.

## Controles administrados por servicios

- Neon cifra conexiones TLS y administra la protección de la infraestructura y los datos almacenados. El esquema no cifra cada importe individualmente porque eso impediría agregaciones, balances y presupuestos; cualquier cifrado de campo futuro necesita un modelo de claves y búsqueda específico.
- HTTPS debe terminar en el proveedor de despliegue. HSTS se envía únicamente en producción.
- Para despliegues con varias instancias, reemplazar el limitador en memoria por un almacén distribuido. Un CAPTCHA administrado requiere proveedor, dominio y claves.
- El monitoreo agregado, alertas y retención de logs deben configurarse en la plataforma de despliegue. Nunca registrar correos, importes, tokens ni cuerpos de consultas.

## Bloqueo pendiente antes de producción

La conexión actual documentada usa `neondb_owner`. Ese rol puede omitir RLS, aunque las consultas ya aplican controles explícitos de sesión y propietario. Antes de producción se debe crear un rol de ejecución `NOBYPASSRLS`, concederle solo las operaciones necesarias y establecer `pagato.user_id` dentro de cada transacción. No cambies la URL a un rol limitado hasta completar y probar ese flujo en una rama de Neon.

En planes que lo permitan, protege la rama de producción y configura IP Allow para las direcciones de salida del proveedor. Las migraciones deben continuar usando la URL directa; la aplicación debe usar la URL pooled.
