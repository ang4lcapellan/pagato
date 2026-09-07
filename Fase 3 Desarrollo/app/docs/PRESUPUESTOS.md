# Presupuestos — PG-13

Disponible en `/budgets`. En escritorio se abre desde el menú lateral; en móvil, desde Inicio → Ver presupuestos o Ajustes → Presupuestos, conservando la navegación inferior de cuatro destinos definida en Fase 2.

## Presupuesto mensual y distribución por categoría

La pantalla principal organiza el trabajo en dos niveles: primero un presupuesto mensual con un límite total y después sus límites por categoría. El detalle vive en `/budgets/[id]`.

- Crear un mes con nombre, moneda, límite total e ingreso mensual estimado opcional.
- Añadir categorías de gasto y distribuir el límite mediante controles deslizantes o importes exactos. Se permiten hasta cien categorías distintas; la suma no puede superar el límite mensual.
- Visualizar una barra de distribución por colores, total planificado, importe sin asignar, ahorro proyectado y tasa de ahorro. Los dos últimos requieren un ingreso estimado; no representan ingresos registrados.
- Guardar la configuración completa de forma atómica. Los cambios del planificador son un borrador hasta pulsar Guardar distribución.
- Consultar debajo el progreso real de las categorías, con el mismo tratamiento visual del módulo individual.
- Copiar un presupuesto a otro mes: conserva límite, moneda, ingreso estimado y asignaciones, pero nunca duplica movimientos. Los gastos ya existentes en el mes de destino sí se incluyen en su consumo.
- Archivar o reactivar sin eliminar movimientos ni configuraciones. Solo puede existir un presupuesto mensual activo por usuario, moneda y mes.

El mes y la moneda se fijan al crear el presupuesto. Para cambiar de período se utiliza Copiar. No se permite copiar una configuración con categorías desactivadas hasta corregirla o reactivarlas. Un presupuesto archivado puede servir como plantilla.

El consumo mensual real incluye **todos** los gastos de la moneda y el mes, incluso categorías sin asignación. El detalle indica cuánto se gastó fuera de las categorías del plan. Eliminar una asignación no borra ni oculta ese gasto del total mensual. Ingresos, transferencias y movimientos eliminados se excluyen.

La distribución y el ahorro proyectado responden inmediatamente a los controles locales. Los consumos reales proceden del servidor y se recalculan al actualizar o volver a consultar la pantalla; no existe sincronización push entre dispositivos. El diseño conserva el logo, Manrope y los estilos Mint Flow de Fase 2, con adaptación móvil y respeto por movimiento reducido.

### Persistencia y seguridad mensual

La migración `0002_monthly_budget_plans.sql` añade `pagato.budget_plans` y la columna opcional `pagato.budgets.plan_id`. Las claves compuestas impiden enlazar categorías presupuestadas con un plan de otro propietario, moneda o período. Se habilita y fuerza RLS para la nueva tabla.

El backend verifica sesión, propiedad, categorías activas de gasto y límite total. Bloquea el perfil y las categorías antes de escribir; una versión evita sobrescribir cambios ajenos y una clave de solicitud permite reintentos sin duplicación. La copia verifica nuevamente la versión del origen dentro de la operación. La restricción agregada de asignaciones se aplica en el backend, no sustituye controles para SQL directo.

- Frontend mensual: `src/modules/budgets/plans/components/`.
- Backend mensual: `src/modules/budgets/plans/actions.ts` y `repository.ts`.
- Tipos, validaciones y aritmética exacta: `src/modules/budgets/plans/model.ts`.

La migración se aplicó en `development` sin eliminar ni reasignar los presupuestos anteriores. Estos permanecen como **Límites individuales**, accesibles desde `/budgets?view=individual`. Las acciones antiguas no pueden modificar asignaciones mensuales.

## Límites individuales conservados

### Funciones

- Crear un límite con nombre, categoría de gasto activa, moneda, importe y fechas inclusivas.
- Consultar consumo, disponible, porcentaje y exceso. Estados visuales: dentro del límite, cerca del límite desde 80%, alcanzado y superado.
- Editar un presupuesto activo; archivar o reactivar sin modificar movimientos ni saldos.
- Filtrar por mes y estado; consultar doce presupuestos por página.
- Separar los resúmenes por moneda, sin conversiones implícitas.

### Cálculo y períodos individuales

El consumo se calcula en el servidor a partir de `pagato.transactions`, no de un contador almacenado. Se incluyen exclusivamente gastos no eliminados de la misma categoría y moneda, en cualquiera de las cuentas del usuario, incluso cuentas archivadas. Se excluyen ingresos y transferencias. Las fechas usan la zona horaria de las preferencias, con UTC como respaldo si no es válida.

Registrar, editar, reclasificar, mover de fecha o eliminar un gasto cambia el consumo correspondiente. Las acciones de movimientos invalidan `/budgets`; la pantalla vuelve a consultar al navegar, regresar desde otra pestaña o pulsar Actualizar progreso. No hay sondeo continuo ni sincronización push entre dispositivos.

El mes filtra presupuestos cuyo período coincide al menos en un día con el mes seleccionado; cada tarjeta mantiene el consumo de su período completo, sin prorratear. Borrar el mes permite consultar cualquier período. Los presupuestos no se renuevan automáticamente.

No se permiten períodos activos solapados para la misma categoría y moneda a través del módulo. Los archivados conservan la definición y siguen mostrando el cálculo del historial vigente, no una fotografía congelada. Si se incluyen archivados en el resumen, los límites pueden solaparse; el resumen no representa el gasto total del usuario.

Disponible nunca es negativo: al exceder el límite se muestra cero disponible y el exceso por separado. El porcentaje puede superar 100%; solo se limita a 100% el ancho visual de la barra. El dinero se mantiene como texto decimal y se calcula con PostgreSQL `numeric` / JavaScript `bigint` para conservar hasta cuatro decimales. Las sumas no se limitan al tamaño de un importe individual.

### Estructura y seguridad individual

- Interfaz: `src/modules/budgets/components/`.
- Validación, tipos y cálculo exacto para presentación: `src/modules/budgets/model.ts`.
- Backend: `src/modules/budgets/server/actions.ts` y `repository.ts`.
- Ruta protegida: `src/app/budgets/` y el matcher de `src/proxy.ts`.
- Persistencia: filas de `pagato.budgets` con `plan_id IS NULL`.

La identidad procede de la sesión verificada del servidor; cada consulta comprueba usuario, sesión vigente, bloqueo, perfil activo y propiedad de los registros. No se acepta un propietario enviado por el navegador. Se usan parámetros SQL y errores públicos sin credenciales ni detalles internos.

Las creaciones reutilizan un UUID por formulario, verificando el contenido en reenvíos. Las modificaciones comprueban la revisión `updated_at`. Las operaciones se serializan mediante bloqueo del perfil financiero antes de tomar una nueva instantánea `ReadCommitted`; las categorías se bloquean para evitar cambios de estado durante la validación. Esto evita solapamientos entre solicitudes del módulo; no sustituye controles para escrituras SQL directas fuera de la aplicación.

La vista inicial `pagato.budget_progress` no se modifica. El módulo consulta directamente un agregado acotado al propietario para evitar el tope de porcentaje y los casts limitados de esa vista, y usar límites temporales compatibles con el índice de movimientos.

Se mantiene la restricción de despliegue documentada: la conexión de desarrollo usa `neondb_owner`, que omite RLS. El módulo filtra por propietario explícitamente, pero antes de producción debe configurarse un rol limitado. Este trabajo no cambia roles ni permisos de Neon.

## Cómo probar el presupuesto mensual

1. Abre Presupuestos → Nuevo presupuesto mensual; selecciona septiembre de 2026, DOP, límite `25000` e ingreso estimado `30000`.
2. Añade cuatro categorías y asigna `3000`, `9500`, `6000` y `4000`. Debes ver `22500` planificados, `2500` sin asignar y un ahorro proyectado de `7500` (`25%`).
3. Ajusta los controles y comprueba que la barra y los totales cambien. Una suma superior a `25000` debe impedir guardar. Guarda la distribución y recarga para comprobar persistencia.
4. Registra un gasto dentro de una categoría y el mes elegidos. Al volver o actualizar, el consumo mensual y la tarjeta de la categoría deben reflejarlo. Editarlo o eliminarlo lógicamente debe recalcular ambos.
5. Registra un gasto en una categoría no asignada: debe incrementar el total mensual y el indicador de gastos fuera de las categorías, sin inventar una asignación.
6. Copia el presupuesto a octubre. Comprueba que se conserven las asignaciones y no se creen transacciones. Si octubre ya tiene gastos, su consumo no será cero.
7. Abre el mismo plan en dos pestañas: guarda una modificación en una y comprueba que la otra no pueda sobrescribirla con una versión antigua.
8. Revisa en un teléfono el formulario, teclado, desplazamiento y controles; las pruebas automatizadas de tamaños no sustituyen una prueba física.

## Cómo probar los límites individuales

1. Inicia sesión y abre Presupuestos → Límites individuales → Nuevo presupuesto.
2. Selecciona Alimentación, DOP, un límite de `1000` y las fechas del mes. Los gastos existentes de esa categoría y período se incluyen desde el primer momento.
3. Para una prueba sin gastos previos, crea antes una categoría de gasto exclusiva para la prueba.
4. Registra un gasto de `250` en esa categoría, una cuenta DOP y una fecha del período. Debes ver `250` consumidos, `750` disponibles y `25%` utilizado.
5. Edita el gasto a `800`: debe indicar `80%`, cerca del límite. Luego a `1100`: `110%`, cero disponible y `100` excedidos.
6. Elimina lógicamente el gasto: su consumo desaparece. Un ingreso, transferencia o gasto en otra moneda no afecta ese presupuesto.
7. Prueba crear otro presupuesto activo para la misma categoría/moneda y fechas coincidentes: debe rechazarse.
8. Archiva el presupuesto y consúltalo con Estado → Archivados. Los movimientos no cambian.
9. En móvil, comprueba el formulario, el selector de fechas, desplazamiento, teclado y cierre. La comprobación automatizada no sustituye una prueba en un teléfono físico.

## Pruebas automatizadas

Desde `Fase 3 Desarrollo/app`:

```text
npm run check
npm run test:e2e
npm run test:budgets:db
npm run test:budgets:ui
npm run test:plans:db
npm run test:plans:ui
npm run build
```

Las pruebas de base de datos requieren Node.js 24, configuración local de development y una sesión activa. Si hay varias, selecciona el usuario de prueba con `PAGATO_TEST_AUTH_SUBJECT`. Cada suite tiene doce escenarios con rollback obligatorio y comprueba que no queda ningún registro temporal. La suite mensual cubre creación, distribución, reenvíos, versiones, copia, exclusiones del consumo, cambios de gastos, estados y aislamiento.

Las pruebas visuales usan los componentes y estilos reales con datos y acciones simulados, sin conexión a Neon. Recorren el módulo individual y, en la suite mensual, creación, copia, distribución, validación, guardado y separación entre proyección y consumo real a 1440, 390 y 320 píxeles. Guardan capturas en `test-results/budgets/`. Ejecuta estas pruebas después de `test:e2e`, que limpia su directorio de resultados al comenzar.
