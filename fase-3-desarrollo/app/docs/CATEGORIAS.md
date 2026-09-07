# Categorías · PG-12

## Acceso y alcance

Abre `/categories` después de iniciar sesión. También se accede desde el panel («Gestionar categorías») o desde Ajustes → Categorías. El acceso de Ajustes conserva la navegación de cuatro opciones del diseño móvil; esta página solo incorpora el acceso al módulo, no implementa las preferencias generales.

La interfaz mantiene Manrope, el logo oficial, la paleta Mint Flow, las tarjetas y la navegación de Fase 2. Como no existe una pantalla dedicada a categorías en los SVG de referencia, se extiende ese lenguaje visual con pestañas de ingresos/gastos y una cuadrícula adaptable. Incluye formularios desplazables en móvil, controles de al menos 44 px, navegación por teclado, errores asociados a los campos y respeto al movimiento reducido.

## Funcionalidades y reglas

- Categorías predeterminadas: dos de ingreso y ocho de gasto, creadas por el perfil financiero existente.
- Categorías personalizadas: nombre de 1 a 80 caracteres, tipo ingreso/gasto, icono y color.
- Nombre, icono y color se pueden editar tanto en predeterminadas como personalizadas; los cambios solo afectan al usuario autenticado.
- El tipo es inmutable después de crear la categoría. Si necesitas otro tipo, crea otra categoría y desactiva la anterior cuando corresponda.
- Un usuario no puede repetir un nombre dentro del mismo tipo, ignorando mayúsculas. Esto incluye las categorías inactivas: puedes reactivar una existente. El mismo nombre sí puede existir una vez en ingresos y otra en gastos.
- Desactivar y reactivar siempre pide confirmación. No hay borrado físico: los movimientos y presupuestos existentes conservan su relación. El esquema ya rechaza crear nuevos movimientos/presupuestos con categorías inactivas.
- El código interno y el origen predeterminado no se pueden alterar desde el navegador. Preparar el perfil de nuevo conserva las personalizaciones y los estados.
- Búsqueda por nombre, filtros por tipo, estado y origen; las cifras superiores muestran ingresos/gastos activos y el total de personalizadas, incluidas las inactivas.

## Organización técnica

`src/app/categories/page.tsx` verifica la sesión, prepara el perfil y obtiene categorías. `src/modules/categories/server/repository.ts` contiene consultas parametrizadas que vuelven a comprobar sesión vigente y propietario en cada operación. `actions.ts` valida entradas, devuelve errores seguros y actualiza las vistas. El navegador nunca decide un `user_id` de confianza.

`model.ts` define validación, tipos y filtros. `components/` contiene la pantalla, iconos, editor y confirmación de estado. Los formularios retienen valores ante errores y bloquean nuevas interacciones mientras guardan.

Se reutilizan `pagato.categories`, sus índices únicos y el trigger `updated_at`. Cada edición y cambio de estado compara la revisión completa con precisión de microsegundos, evitando sobrescrituras desde formularios desactualizados. La creación usa un UUID estable por formulario para que repetir una solicitud no duplique filas. No se aplican migraciones ni cambios de permisos.

**Pendiente antes de producción:** la conexión actual usa `neondb_owner` y puede omitir RLS. Los filtros explícitos no sustituyen configurar y probar un rol de aplicación limitado. Los módulos futuros deben validar de nuevo estado y propietario al guardar movimientos/presupuestos, incluyendo sus escrituras concurrentes. La desactivación no cancela presupuestos existentes.

## Prueba manual

1. Desde `fase-3-desarrollo/app`, ejecuta `npm run dev`. Inicia sesión y abre `http://localhost:3000/categories`.
2. Comprueba las categorías iniciales, cambia entre Gastos e Ingresos y usa búsqueda y filtros.
3. Crea una personalizada, por ejemplo «Mascotas», de gasto. Elige icono y color. Debe aparecer con la marca «Personalizada».
4. Edita el nombre o el color. Recarga y comprueba persistencia. El tipo debe permanecer bloqueado.
5. Intenta repetir el mismo nombre dentro del mismo tipo, incluso con otra combinación de mayúsculas: debe rechazarse. El mismo nombre en el otro tipo sí se permite.
6. Envía un nombre vacío: debe enfocar el campo, explicar el error y conservar tipo, icono y color.
7. Desactiva una categoría y búscala en Inactivas. Reactívala y comprueba que vuelve a Activas. Las categorías iniciales también admiten estas operaciones.
8. Personaliza o desactiva una predeterminada, entra al panel y vuelve a Categorías: no debe restablecerse ni duplicarse.
9. Abre un formulario de edición en dos pestañas. Guarda en una e intenta guardar el formulario antiguo de la otra. Debe rechazarlo y pedir actualizar.
10. Sin sesión, `/categories` y `/settings` redirigen al acceso. Con un segundo usuario, solo deben verse sus propias categorías.

Para móvil, repite en la emulación del navegador a 390 × 844 y a 320 px de ancho. Verifica el botón «+», la barra inferior, los filtros, el teclado y el desplazamiento del formulario hasta sus botones. La emulación no sustituye las pruebas en un teléfono real. Para HTTPS y acceso desde otro dispositivo, consulta `PRUEBAS_AUTENTICACION.md`.

No uses datos sensibles como nombres de cuentas bancarias o credenciales en los nombres de categorías. Los datos creados manualmente sí permanecen en la base de desarrollo; desactiva las categorías de prueba al terminar.

## Pruebas automatizadas

- `npm run check`: lint, TypeScript y pruebas de modelo, acciones e interfaz, además de regresiones de los módulos anteriores.
- `npm run test:e2e`: navegación y autenticación en Chromium de escritorio y móvil, incluyendo protección de Categorías y Ajustes. Estas pruebas no crean registros autenticados.
- `npm run test:categories:db`: 13 escenarios de integración con las consultas reales. Verifica creación idempotente, duplicados, mismo nombre entre tipos, edición, revisiones, tipo inmutable, estados, preservación de predeterminadas, sesiones inválidas, aislamiento y conservación de historial.
- `npm run build`: compilación de producción.

La integración requiere Node.js 24, `.env.local`, la rama development prevista y una sesión de prueba vigente. Si hay varios perfiles con sesión, selecciona el usuario de prueba mediante `PAGATO_TEST_AUTH_SUBJECT`. Cada escenario se revierte por completo mediante una excepción intencional o el error de restricción esperado, sin imprimir credenciales ni persistir fixtures. Tampoco se modifican roles o tablas gestionadas de autenticación.
