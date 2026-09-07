# Movimiento y transiciones

La interfaz comparte los tiempos definidos en `src/app/globals.css`. Se conserva la identidad Mint Flow y no se añaden dependencias de animación.

| Interacción | Duración |
| --- | --- |
| Botones, campos, pestañas, colores y estados | 200 ms |
| Entrada de tarjetas y ventanas | 360 ms |
| Aparición del contenido de pantalla y autenticación | 440 ms |
| Cierre solicitado de ventanas | 220 ms |
| Barras de progreso pasivas | 420 ms |
| Distribución al arrastrar los controles de presupuesto | 180 ms |

Las listas usan una secuencia acotada a 105 ms: una lista larga no prolonga la espera. Las entradas se basan en opacidad y desplazamientos pequeños, sin cambiar las dimensiones del contenido. No hay interceptación de enlaces, esperas antes de navegar, contadores monetarios ficticios ni retrasos en el guardado. Los campos y borradores no se remontan para animarlos. Las barras interpolan su representación visual sin alterar los cálculos.

El componente `Modal` coordina la salida de la X, Escape y los botones con `data-modal-close`. Mantiene el diálogo abierto durante la salida, bloquea interacciones duplicadas y restaura el foco y el desplazamiento al desmontar. Se incluye un temporizador de respaldo si no llega `animationend`, cancelado al desmontar. Las operaciones pendientes no se pueden cerrar. Tras un guardado exitoso, la aplicación puede cerrar inmediatamente sin esperar una animación.

El movimiento reducido del sistema elimina las esperas escalonadas y los desplazamientos interactivos, minimiza las duraciones y permite cerrar los diálogos inmediatamente. Los efectos de elevación se reservan para dispositivos con puntero; no quedan activados por un toque. Los indicadores giratorios solo se usan durante cargas reales, y la decoración de autenticación no permanece animándose indefinidamente.

## Validación

```text
npm run check
npm run test:e2e
npm run test:motion:ui
npm run test:budgets:ui
npm run test:plans:ui
npm run build
```

La prueba de movimiento usa componentes y CSS reales con datos simulados, sin acceso a cuentas ni escrituras en la base de datos. Verifica tiempos, interpolación, preservación de campos, Cancelar/X/Escape, restauración de foco, ausencia de desbordamiento y movimiento reducido a 1440, 390 y 320 píxeles. Sus capturas están en `test-results/budgets/`; ejecutar después de las pruebas de navegación, que limpian ese directorio. No sustituye la comprobación de rendimiento en un teléfono físico.
