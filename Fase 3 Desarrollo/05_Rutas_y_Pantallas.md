# Rutas y pantallas

| Ruta | Pantalla | Estado visual |
|---|---|---|
| `/login` | Inicio de sesión | validación, carga simulada, aviso mock |
| `/register` | Registro | validación y navegación a verificación |
| `/forgot-password` | Recuperación | formulario y confirmación |
| `/verify-email` | Verificación | estado pendiente y simulación |
| `/reset-password` | Restablecimiento | coincidencia de contraseñas |
| `/app/dashboard` | Dashboard | métricas, flujo, presupuestos, recientes |
| `/app/transactions` | Transacciones | búsqueda, filtros, tabla y sin resultados |
| `/app/transactions/new` | Nueva transacción | gasto, ingreso, transferencia y snackbar |
| `/app/accounts` | Cuentas | balances y crédito separado |
| `/app/accounts/new` | Nueva cuenta | formulario y confirmación visual |
| `/app/budgets` | Presupuestos | métricas, progreso y exceso |
| `/app/reports` | Reportes | línea, donut, resúmenes y exportación visual |
| `/app/settings` | Configuración | perfil, tema, privacidad y seguridad visual |

La protección de rutas no es real. `/app` y el login se conectan directamente para facilitar la demostración.
