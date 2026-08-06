# Correcciones aplicadas a los diseños de Stitch

| Pantalla | Problema | Criterio PDL | Solución implementada |
|---|---|---|---|
| Global | Primarios negros/navy | Primary `#0B57D0`; acción principal azul | Tokens oficiales y botones Filled Primary |
| Global | Inter y Roboto mezclados | Google Sans o Roboto Flex | Roboto Flex con fallbacks del sistema |
| Global | Material Symbols Outlined | Solo Material Symbols Rounded | Componente `MaterialIcon` único |
| Global | Paletas independientes por HTML | Tokens semánticos | Variables CSS para claro/oscuro; sin HEX en componentes |
| Navegación | Sidebars incompatibles | Rail/sidebar M3 estable | 256 px desktop, 80 px laptop, drawer bajo 1024 px |
| Acceso | Imágenes decorativas y textos mixtos | Calma, claridad, localización | Composición propia en español, sin archivos externos necesarios |
| Formularios | Placeholder como etiqueta y alta densidad | Etiqueta siempre visible | Labels persistentes, ayuda y error próximos al campo |
| Dashboard | `Overview`, métricas ambiguas | Balance total hasta tener pasivos completos | `Balance total`, periodo y DOP; crédito excluido |
| Transacciones | Transferencia tratada como polaridad | Transferencia neutral | Icono neutral y cuentas origen/destino visibles |
| Importes | `$`, `RDS` y `RD$` inconsistentes | Formato localizado | Utilidad central `formatMoney` |
| Cuentas | Crédito disponible parece dinero propio | Diferenciar activos y crédito | Información separada debajo del balance de tarjeta |
| Presupuestos | Rojo como castigo | Lenguaje neutral y color con significado | Progreso + porcentaje + mensaje accionable |
| Tablas | Demasiados iconos y columnas | Menú por fila, cantidades a la derecha | Dropdown por fila y columnas secundarias adaptables |
| Gráficos | Visuales sin explicación | Título, periodo, unidades y alternativa | Resumen textual debajo de cada gráfica |
| Oscuro | Inversión y superficies planas | Tema tonal propio | Superficies `#121212/#1E1E1E/#2A2A2A` y colores on-surface |
| Estados | Patrones aislados | Vacío, carga, error reutilizables | `EmptyState`, `Skeleton`, `ErrorState`, `Snackbar`, `Modal` |
| Privacidad | Cobertura inconsistente | Control global | `PrivacyAmountToggle` en top bar y `FinancialAmount` central |
| Responsive | Capturas corruptas y grids fijos | 1440/1280/1024, sin posiciones absolutas | CSS Grid flexible; verificación sin overflow en rutas |

Decisión pendiente del PDL: se eligió densidad cómoda para tablas y Roboto Flex mientras no exista confirmación legal de Google Sans.
