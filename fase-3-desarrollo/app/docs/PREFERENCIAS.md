# Preferencias · PG-08

## Uso

1. Inicia sesión y entra en Ajustes desde la barra lateral o la navegación inferior.
2. Selecciona tema, idioma, moneda, zona horaria y formatos. La vista previa muestra ejemplos; pulsa Guardar cambios para aplicar.
3. Recorre Inicio, Cuentas, Movimientos y Presupuestos: cambian los textos y formatos, no los datos originales.
4. Recarga o vuelve a iniciar sesión. Las preferencias pertenecen a tu usuario y se recuperan también desde otro dispositivo.
5. Restaurar predeterminadas solicita confirmación. No borra cuentas, categorías, movimientos ni presupuestos.

Valores iniciales: sistema, español, DOP, America/Santo_Domingo, DD/MM/YYYY y 1,234.56. Sistema responde a los cambios del sistema operativo sin volver a guardar. El idioma de acceso sin sesión permanece en español; las preferencias personales se recuperan tras autenticarse. Los nombres de categorías, cuentas, presupuestos y las descripciones escritos por el usuario no se traducen.

## Presentación y consistencia

- La moneda principal es una selección predeterminada, no un tipo de cambio. Los gráficos y totales conservan la separación por moneda.
- Las fechas visibles usan el formato elegido. Los campos nativos date/month/datetime-local conservan el formato del navegador. Los montos se introducen sin separadores de miles, con punto o coma decimal.
- La zona horaria afecta las horas visibles, filtros y límites diarios de presupuestos, sin modificar los instantes almacenados.
- Importes y cálculos siguen siendo texto decimal/BigInt; la presentación no convierte cantidades a coma flotante.
- HTML inicial y cliente reciben las mismas preferencias. El tema del sistema se aplica con CSS antes de hidratar, sin localStorage como fuente de verdad.
- Las rutas se vuelven a validar tras guardar, restaurar, iniciar o cerrar sesión. Otra pestaña que tenga un formulario antiguo debe recargar antes de guardar: una revisión obsoleta se rechaza.

## Backend y seguridad

`pagato.user_preferences` se actualiza desde acciones de servidor. El usuario se obtiene de la sesión verificada, nunca de un ID enviado por el formulario. El repositorio comprueba usuario activo, sesión vigente, propietario y updated_at. La zona horaria también debe existir en PostgreSQL. Solo se actualizan campos de preferencias.

La migración 0003 añade number_format sin modificar registros financieros. El script de aplicación está limitado al endpoint development; no promueve cambios a main. Se mantiene la observación de los módulos anteriores: antes de producción debe configurarse un rol de base de datos de mínimo privilegio; el control de propietario explícito sigue siendo obligatorio.

## Pruebas

Desde `fase-3-desarrollo/app`:

```powershell
npm run check
npm run build
npm run test:preferences:db
npm run test:preferences:ui
```

La prueba de base de datos necesita una sesión activa en development; si hay varias, selecciona explícitamente PAGATO_TEST_AUTH_SUBJECT. Ejecuta cambios dentro de una transacción con rollback y confirma que las preferencias originales, las cuentas y las transacciones quedan intactas. No imprime credenciales ni datos personales.

La prueba UI usa componentes reales, HTML generado en Node e hidratación en Chromium; las acciones están simuladas y no escriben en Neon. Cubre 1440, 390 y 320 px, español/inglés, claro/oscuro/sistema, formatos, guardado/recarga, confirmación/cancelación de restauración y el Dashboard. Las capturas quedan en test-results/preferences (no se versionan).

Para comprobarlo manualmente en móvil: abre las herramientas del navegador (F12), activa la barra de dispositivos (Ctrl+Shift+M), selecciona un ancho de 390 px y repite guardado, navegación y restauración. Prueba además un cambio de tema del sistema y recarga. Para una validación final en Android usa la URL HTTPS del despliegue de pruebas: no necesitas otra base de datos ni una aplicación móvil separada.
