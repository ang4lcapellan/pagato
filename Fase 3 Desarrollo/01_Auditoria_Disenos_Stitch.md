# Auditoría de diseños de Google Stitch

Fecha: 2026-08-06  
Fuente visual principal: `Fase 2 Diseño/PagaTo_Design_System_PDL_v2.0.pdf`  
Material auditado: 44 carpetas exportadas, 42 archivos HTML/Markdown y 42 capturas; 39 capturas son imágenes válidas y 3 exportaciones de Dashboard tienen solo 28 bytes.

> La ruta `BOB/Documentacion PagaTo'/Fase 2 Diseño` indicada inicialmente no existe. Los recursos reales están en `BOB/PagaTo'/Fase 2 Diseño`. No se movió, eliminó ni modificó ningún archivo original.

## Inventario de pantallas y estados

| Área | Pantallas o variantes encontradas |
|---|---|
| Acceso | Login claro/oscuro; registro claro/oscuro; recuperación; verificación |
| Dashboard | concepto, desktop claro/oscuro, laptop, tablet, vacío y skeleton |
| Transacciones | desktop claro/oscuro, detalle lateral, tablet, selección múltiple, vacío, carga y eliminación |
| Nueva transacción | gasto, transferencia, oscuro y errores tablet |
| Cuentas | listado claro, detalle oscuro y estados tablet |
| Nueva cuenta | claro, oscuro, personalización tablet y errores/diálogo |
| Presupuestos | resumen claro, detalle oscuro, tablet y diálogos |
| Reportes | resumen, flujo/balance tablet, categorías oscuro, exportación, privacidad, vacío y carga |
| Configuración | perfil, apariencia, seguridad y datos/zona de peligro |
| Sistema | confirmaciones/guardado y dos archivos `DESIGN.md` incompatibles |

No hay una pantalla independiente completa de restablecimiento de contraseña; debe reconstruirse usando el patrón del flujo de recuperación. Tampoco existe una pantalla coherente para error recuperable global.

## Problemas e inconsistencias

1. **Fuente de verdad fragmentada.** Stitch generó dos sistemas: uno con `#001F3F/#000613`, otro corporativo más rígido. Ambos contradicen el Primary oficial `#0B57D0`.
2. **Acciones principales negras.** Login, alta de cuenta, transacciones y sidebar usan negro/navy casi negro; el PDL exige Filled Primary azul.
3. **Tipografía mezclada.** Parte del material usa Inter y otra Roboto Flex. El PDL permite Google Sans o Roboto Flex, no Inter.
4. **Iconografía inconsistente.** Se usa `material-symbols-outlined`; la biblioteca obligatoria es Material Symbols Rounded.
5. **Idioma mezclado.** Hay navegación y títulos en inglés (`Overview`, `Settings`, `Reports`, `Good Morning`) junto a formularios en español.
6. **Formato monetario inconsistente.** Aparecen `$`, `RD$`, `RDS`, `-RD$` y cantidades con estilos distintos.
7. **Jerarquía financiera incorrecta.** Algunos conceptos tratan crédito disponible o tarjetas como balance propio; el MVP debe mostrar `Balance total` y subtotales por moneda.
8. **Transferencias ambiguas.** Algunas variantes las aproximan a ingreso/gasto; deben ser neutrales y mostrar origen y destino.
9. **Responsive divergente.** Sidebars de 80, 240 y 272 px, headers distintos y rejillas que no comparten reglas. Tres capturas de Dashboard están corruptas.
10. **Accesibilidad insuficiente.** Varios controles son solo iconos, campos dependen del placeholder, estados usan solo color, targets pequeños y gráficos sin alternativa textual.
11. **Modo oscuro inconsistente.** Superficies casi negras sin jerarquía tonal, tarjetas claras dentro de layouts oscuros y contraste dudoso en estados.
12. **Densidad excesiva.** Formularios y tablas muestran demasiadas acciones simultáneas; algunas tarjetas reúnen métricas, gráficos y acciones sin prioridad clara.
13. **Código no reutilizable.** Cada HTML contiene su propia configuración Tailwind, paleta, fuentes y estructura; no existe una biblioteca compartida.
14. **Dependencias externas de prototipo.** Los HTML cargan Tailwind y fuentes por CDN y contienen datos extensos incrustados.
15. **Estados incompletos.** Hay ejemplos de vacío/carga/error, pero no forman un patrón común ni cubren todas las rutas.

## Elementos reutilizables identificados

- App shell con navegación primaria, top bar, privacidad, tema y perfil.
- Tarjetas de métricas, cuentas y presupuestos.
- Tabla/lista de transacciones, filtros y paginación.
- Formularios de acceso, transacción y cuenta.
- Selector segmentado para tipo de transacción.
- Paneles de estado: vacío, carga, error, snackbar, modal y drawer.
- Patrones de gráficos: línea, barras y donut con resumen textual.

## Elementos que deben reconstruirse

- Tokens y temas semánticos; no reutilizar paletas de cada HTML.
- Navegación, formularios y tablas como componentes React accesibles.
- Formateadores centrales de moneda, fecha, porcentaje y privacidad.
- Gráficos con paleta aprobada y alternativa textual.
- Login/registro sin imágenes externas necesarias para ejecución.
- Restablecimiento de contraseña y error recuperable.
- Todos los estados responsive, evitando posiciones absolutas de Stitch.

## Decisiones de corrección

- Aplicar el PDL v2.0 antes que cualquier exportación de Stitch.
- Usar Roboto Flex como alternativa abierta; Material Symbols Rounded como única iconografía.
- Primary `#0B57D0`; tokens semánticos claros/oscuros en CSS; ningún HEX dentro de componentes.
- Sidebar de 256 px en desktop, rail de 80 px en laptop y drawer en tablet.
- Interfaz en español; estructura preparada para traducciones sin mezclar idiomas.
- Balance total como métrica principal; crédito disponible no se suma al dinero propio.
- Transferencias neutrales; ingresos y gastos incluyen signo, icono y texto además del color.
- Tablas cómodas por defecto y columnas secundarias ocultas en tablet.
- Datos simulados exclusivamente en `src/mocks`; la capa será reemplazable por HTTP.
- Tema `light`, `dark` y `system`, persistido localmente; privacidad persistida por dispositivo.

## Componentes comunes previstos

Button, IconButton, MaterialIcon, TextField, PasswordField, Select, SearchField, Checkbox, Radio, Switch, SegmentedControl, Chip, Badge, Card, MetricCard, FinancialAmount, ProgressBar, Modal, Drawer, Snackbar, Tooltip, DropdownMenu, DateRangeSelector, Skeleton, EmptyState, ErrorState, DataTable, Pagination, AppShell, Sidebar, TopBar, PageHeader, ThemeToggle y PrivacyAmountToggle.

## Riesgos

- Alcance visual grande para una sola iteración; se priorizará consistencia y navegación sobre interacciones complejas.
- La fuente Material Symbols/Roboto Flex depende de Google Fonts si no se empaqueta; se incluirán fallbacks seguros.
- Recharts requiere validar contraste y resumen textual por gráfica.
- Los mocks numéricos sirven solo para presentación; dinero real deberá usar decimal en backend y contratos sin pérdida.
- La futura i18n requiere extraer textos a catálogos; en esta base se evita mezclar idiomas, pero no se añade una librería no autorizada.

## Orden recomendado

1. Tooling Vite/TypeScript/Tailwind.
2. Tokens, temas y utilidades financieras.
3. Componentes base y feedback.
4. App shell responsive.
5. Acceso y recuperación.
6. Dashboard.
7. Transacciones y formulario.
8. Cuentas y formulario.
9. Presupuestos y reportes.
10. Configuración.
11. Estados, responsive, accesibilidad y revisión visual.
12. Documentación, lint, typecheck y build.

