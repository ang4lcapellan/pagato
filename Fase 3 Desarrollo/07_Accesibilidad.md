# Accesibilidad

Medidas aplicadas para WCAG 2.2 AA en esta base:

- landmarks, encabezados y navegación semántica;
- labels visibles y mensajes de error asociados;
- nombres accesibles para botones de icono;
- foco visible de 3 px y navegación por teclado nativa;
- targets importantes mínimos de 44 px;
- contraste basado en tokens claro/oscuro;
- estados con texto, signo e icono, no solo color;
- captions y alineación semántica en tabla;
- role y valores en barras de progreso;
- resúmenes textuales para gráficas;
- soporte `prefers-reduced-motion`;
- sidebar/drawer con nombres accesibles;
- privacidad aplicada por un componente financiero central.

Verificación manual: 13 rutas sin desbordamiento horizontal a 1024 px, cero botones sin nombre en login y consola sin errores. Pendiente: auditoría automática con axe, focus trap completo del modal y pruebas a zoom 200 %.
