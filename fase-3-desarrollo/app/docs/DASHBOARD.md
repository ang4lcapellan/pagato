# Inicio / Dashboard — PG-06

El módulo reemplaza el panel provisional en `/dashboard`, destino del acceso **Inicio**. La portada pública `/` se conserva para visitantes sin sesión. El diseño parte de `Fase 2 Diseño/Mint Flow UI/Desktop/01_Dashboard_Desktop.svg`, su variante Mobile y el manual Mint Flow: logo oficial, Manrope, fondo claro, tarjeta verde y navegación compartida.

## Reglas de cálculo

| Indicador | Fuente y alcance |
| --- | --- |
| Balance total | Suma de `pagato.account_balances` de cuentas **activas** y moneda seleccionada. Es el saldo registrado actual, independiente del filtro de fechas. |
| Ingresos | Importe de destino de ingresos no eliminados dentro del período y moneda. |
| Gastos | Importe de origen de gastos no eliminados dentro del período y moneda. |
| Balance neto | Ingresos menos gastos; puede ser negativo. |
| Ahorro | Excedente positivo del neto, o cero si hay déficit. No equivale al saldo de cuentas de ahorro ni al ingreso estimado del presupuesto. |
| Tasa de ahorro | Neto / ingresos × 100; puede ser negativa. Sin ingresos se muestra como no disponible. |
| Presupuestos | Activos que se cruzan con el período, en la misma moneda. El consumo abarca el período completo de cada presupuesto. |

No se convierten ni se suman monedas distintas. Las transferencias aparecen en movimientos y afectan a los saldos de las cuentas, pero nunca se suman como ingresos/gastos. En transferencias entre monedas se muestran ambos importes y sus códigos. Las cuentas archivadas quedan fuera del balance activo, pero sus movimientos históricos sí forman parte de los ingresos/gastos del período.

Los límites de fechas usan la zona horaria de las preferencias: desde las 00:00 del primer día hasta antes de las 00:00 del día posterior al último. El mes actual también se determina con esa zona. El rango personalizado admite como máximo 366 días. Los importes viajan como texto decimal y se calculan con PostgreSQL numeric y BigInt; Number se utiliza únicamente para coordenadas de gráficos.

## Gráficos y navegación

- Evolución con ingresos/gastos separados y bloques sin movimientos en cero: diario hasta 14 días, bloques de 7 días hasta 62 y mensual en períodos mayores. Tabla desplegable con cifras exactas.
- Distribución: cinco categorías con más gasto y el resto agrupado como “Otras categorías”. Solo incluye gastos no eliminados.
- Cinco movimientos recientes del período y moneda; detalle, edición y eliminación con los componentes existentes. “Ver historial” mantiene fechas y abre el historial completo, que incluye todas las monedas.
- Hasta cuatro presupuestos, primero mensuales. Los hijos de un plan no se repiten como presupuestos independientes. Cada presupuesto lleva sus propias fechas y enlace.
- “Nueva transacción” carga cuentas/categorías autorizadas al abrir el formulario. Guardar, editar o eliminar actualiza el resumen mediante las acciones existentes.
- En móvil los filtros se despliegan con “Cambiar período” para dar prioridad a las cifras. Gráficos y formularios admiten movimiento reducido; no hay contadores de dinero ficticios.
- Estado vacío es distinto del error de conexión; en un error no se sustituyen cifras por ceros. Hay carga visual y reintento.

## Seguridad y estructura

La página requiere sesión, prepara el perfil financiero si corresponde, valida filtros y consulta el repositorio. El repositorio verifica sesión viva, usuario no bloqueado y perfil activo; restringe cuentas, movimientos, categorías y presupuestos al propietario. Todos los apartados se consultan en una sola instantánea SQL y no se descarga el historial completo al cliente. No se agregaron credenciales, tablas ni permisos.

La conexión de desarrollo sigue usando `neondb_owner`; antes de producción continúa pendiente configurar un rol limitado y verificar RLS. No se modificó esa configuración en este módulo.

## Cómo probarlo

1. Desde `fase-3-desarrollo/app`, ejecuta `npm run dev`, inicia sesión y entra a Inicio (`http://localhost:3000/dashboard`).
2. Selecciona un mes y una moneda. Comprueba el saldo contra Cuentas y los ingresos/gastos contra Movimientos del mismo período.
3. Registra un ingreso y un gasto desde Inicio. Verifica que las cifras y el gráfico se actualicen. Abre un movimiento reciente, edítalo y luego elimínalo para comprobar el recálculo.
4. Registra una transferencia: no debe alterar ingresos, gastos ni ahorro. Si es entre cuentas activas de la misma moneda, no cambia su balance agregado.
5. Consulta otra moneda y otro período. El balance de cuentas activas permanece independiente de las fechas.
6. Abre un presupuesto mensual: el Dashboard y su detalle deben coincidir en el consumo del período completo del presupuesto, sin repetir sus límites por categoría como planes independientes.
7. En Chrome/Edge abre las herramientas de desarrollo, activa el modo dispositivo y prueba 390 y 320 px. Abre “Cambiar período”, los detalles y el formulario. Repite con movimiento reducido del sistema.

Comandos de verificación:

```sh
npm run check
npm run build
npm run test:e2e
npm run test:dashboard:db
npm run test:dashboard:ui
```

La prueba de base de datos solo admite Neon development, requiere una sesión de prueba activa y revierte todos los registros temporales mediante rollback. Con varias sesiones de usuarios distintos se debe seleccionar `PAGATO_TEST_AUTH_SUBJECT` localmente, sin publicarlo. La prueba visual utiliza los componentes reales con datos ficticios y acciones en memoria; no altera tus finanzas. Genera HTML en Node y lo hidrata en Chromium, comprobando también los errores recuperables de React. Sus capturas se guardan en `test-results/dashboard/` (ignorado por Git). La emulación no sustituye una prueba en un teléfono físico.
