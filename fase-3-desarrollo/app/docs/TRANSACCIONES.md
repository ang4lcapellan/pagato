# Transacciones · PG-01, PG-02, PG-07, PG-10 y PG-11

## Acceso y funcionalidades

Desde el panel, abre **Ver movimientos**, o usa **Movimientos** en la navegación. Ruta protegida: `/transactions`.

- Registra gastos e ingresos con cuenta, categoría, monto, fecha/hora y descripción, método de pago y notas opcionales.
- Transfiere entre dos cuentas propias. Una transferencia es un solo registro con ambos importes, no dos escrituras independientes.
- En una misma moneda, el importe recibido coincide con el enviado. Entre monedas distintas, introduce ambos importes reales; no hay cotizaciones automáticas ni comisiones implícitas.
- Consulta detalle, edita y elimina lógicamente con confirmación. El registro eliminado queda almacenado con `deleted_at`, pero desaparece del historial y deja de afectar balances. No existe restauración desde la interfaz.
- Filtra por fechas inclusivas, cuenta (origen o destino), categoría y tipo. Busca por descripción, sin distinguir mayúsculas; `%` y `_` son texto literal, no comodines.
- Historial ordenado por fecha e identificador, 20 resultados por página, filtros conservados en la URL. Se corrige una página que quedó fuera del rango al eliminar registros.
- Resúmenes de ingresos, gastos y diferencia por moneda sobre todo el conjunto filtrado. Las transferencias no son ingresos ni gastos. Estos resúmenes no son el saldo actual de las cuentas.

Esto es un registro financiero: no mueve dinero en el banco, no conecta Google Pay y no importa correos.

## Organización

```text
src/app/transactions/              Ruta, carga y protección del servidor
src/modules/transactions/
  model.ts                        Validación, DTO, fechas y filtros
  server/repository.ts            Consultas parametrizadas y bloqueos
  server/actions.ts               Autenticación, operaciones y actualización de vistas
  components/                    Historial, editor, detalle y confirmación
tests/integration/               Pruebas reales reversibles y de concurrencia
```

Frontend y backend se separan en `components/` y `server/`; el navegador no recibe la conexión a la base. Se reutilizan `pagato.transactions`, `pagato.accounts`, `pagato.categories` y la vista `pagato.account_balances`. No se necesitan migraciones nuevas.

## Consistencia y seguridad

La identidad se obtiene de la sesión verificada. Cada consulta vuelve a comprobar sesión vigente, usuario no bloqueado y perfil activo; cada referencia pertenece al mismo propietario. Se rechazan cuentas archivadas, categorías inactivas o incompatibles y transferencias a la misma cuenta. Al editar un registro que conserva referencias inactivas, primero reactívalas o selecciona referencias activas; eliminar sí está permitido.

Los montos viajan como texto decimal y se calculan con `numeric` en PostgreSQL, nunca con coma flotante. Se admiten hasta 15 dígitos enteros y 4 decimales. Se permiten saldos negativos, sin simular autorizaciones bancarias ni límites crediticios.

Las escrituras bloquean ordenadamente las cuentas del propietario dentro de una transacción `ReadCommitted`. Esto serializa las operaciones financieras de un usuario y evita carreras con cambios de moneda/saldo inicial; otros usuarios son independientes. Después del bloqueo, se comprueban las referencias en una nueva instantánea. Las categorías se bloquean durante su validación para coordinar la desactivación. La modificación de cuentas también obtiene su bloqueo antes de comprobar si ya tiene movimientos.

La moneda que se mostró en el formulario se compara con la moneda actual de la cuenta: un cambio concurrente no reinterpreta un importe. Antes de confirmar la operación, se evalúan los balances con límite `numeric(19,4)`; si hay desbordamiento, toda la escritura se revierte.

Cada formulario de creación conserva un UUID que se almacena en `client_request_id`. Un reenvío concurrente idéntico no duplica registros. La misma clave con otro contenido se rechaza; no resucita registros eliminados. Edición y eliminación comparan e incrementan `version`, evitando sobrescribir otra pestaña. Tras una respuesta de red incierta, reintenta sin cerrar el formulario o actualiza el historial para comprobar el estado.

La fecha y los límites diarios usan la zona horaria del perfil, no la del servidor o dispositivo. Si una zona guardada no existe en PostgreSQL se usa UTC. Las horas inexistentes por cambio estacional se rechazan; en horas repetidas se aplica la interpretación de PostgreSQL. Los filtros incluyen todo el último día mediante un límite superior exclusivo del día siguiente.

**Antes de producción:** la conexión actual usa `neondb_owner` y omite RLS. Los controles explícitos se prueban, pero falta configurar un rol de aplicación limitado. También corresponde revisar límites de solicitudes, observabilidad sin datos sensibles y pruebas en dispositivos físicos. No se alteraron credenciales, roles ni tablas de autenticación.

## Diseño y accesibilidad

Se siguen los SVG de Transacciones y Nueva transacción de Fase 2: logo oficial, Manrope, paleta Mint Flow, tabla de escritorio, listado móvil, navegación inferior y panel lateral de registro (pantalla completa en móvil). Los formularios conservan datos ante errores, enfocan el primer campo inválido, bloquean envíos durante el guardado y respetan movimiento reducido. Filtros y campos adicionales amplían el diseño original para cubrir el alcance funcional.

## Cómo probar

En `fase-3-desarrollo/app`, ejecuta `npm run dev`. Inicia sesión y abre `http://localhost:3000/transactions`.

1. Crea dos cuentas de prueba, ambas DOP: A con saldo inicial 1,000 y B con saldo 0. No uses tus cuentas reales para estas comprobaciones.
2. Registra un ingreso de 500 en A: debe quedar en 1,500.
3. Registra un gasto de 200 en A: debe quedar en 1,300.
4. Transfiere 300 de A a B: A debe quedar en 1,000 y B en 300. El total combinado no cambia; la transferencia no entra en ingresos/gastos.
5. Abre el detalle del gasto y cambia 200 a 250: A debe quedar en 950.
6. Elimina la transferencia con confirmación: A debe quedar en 1,250 y B en 0. El historial deja de mostrarla.
7. Combina los filtros, busca la descripción, cambia de página y prueba las fechas en el límite del día.
8. Abre el mismo movimiento en dos pestañas. Guarda una edición en la primera e intenta guardar la versión anterior en la segunda: debe rechazarse.
9. Prueba una cuenta archivada, categoría inactiva, monto cero/negativo y transferencia a la misma cuenta. No deben producir registros válidos.
10. En móvil, repite a 390 y 320 px de ancho y después en tu teléfono. Comprueba el teclado, desplazamiento, filtros, cierre y botones de guardar/confirmar. La emulación no sustituye el dispositivo físico.

Los registros manuales permanecen en development: elimina lógicamente los movimientos de prueba y archiva las cuentas al terminar. Para acceso desde un teléfono, consulta `PRUEBAS_AUTENTICACION.md`.

## Pruebas automatizadas

- `npm run check`: lint, TypeScript, modelos, acciones, interfaz y regresiones.
- `npm run test:e2e`: navegación sin sesión y protección de rutas en Chromium de escritorio y móvil. No crea movimientos autenticados.
- `npm run test:transactions:db`: 17 escenarios reales. Cada caso se revierte completamente, incluso si falla una aserción; no conserva fixtures.
- `npm run test:transactions:concurrency`: 4 escenarios con solicitudes realmente simultáneas. Crea temporalmente cuentas/categorías/transacciones sintéticas con UUID propios y las retira en `finally`. No modifica cuentas reales. No interrumpas este comando durante la ejecución; una interrupción abrupta puede requerir limpiar esos fixtures explícitos.
- `npm run build`: compilación de producción.

La integración requiere Node.js 24, `.env.local`, el endpoint development previsto y una sesión de prueba activa. Si hay varios usuarios activos, selecciona uno con `PAGATO_TEST_AUTH_SUBJECT`. Los scripts no imprimen credenciales ni información financiera personal.
