# Cuentas financieras · PG-03

## Alcance

Ruta: `/accounts`, disponible desde «Ir a mis cuentas» en el panel. Requiere sesión y perfil financiero activo.

- Crear y consultar cuentas, ver su detalle y editar sus datos.
- Tipos: efectivo, bancaria, ahorros, tarjeta de crédito, billetera digital, inversión y otra cuenta.
- Monedas admitidas en el formulario: DOP, USD, EUR, CAD, MXN y COP.
- Nombre, institución opcional, color y descripción; límite opcional para tarjetas.
- Saldo inicial positivo, cero o negativo, con hasta cuatro decimales. No se admiten separadores de miles.
- Archivar y reactivar con confirmación, sin eliminar la cuenta ni su historial.
- Buscar por nombre, institución o tipo; filtrar por moneda y estado.
- Totales de cuentas activas separados por moneda, sin conversión. La distribución visual considera únicamente saldos positivos de una moneda e indica cuál.

Es un registro manual de finanzas: no conecta cuentas bancarias ni realiza movimientos de dinero. El límite de crédito no se suma al saldo; una deuda se representa como saldo negativo. El disponible estimado mostrado es límite más saldo, no información consultada al banco.

## Organización y datos

`src/app/accounts/page.tsx` coordina la sesión, el perfil y la lectura del módulo. `src/modules/accounts/components/` contiene la pantalla, el editor y el detalle. `src/modules/accounts/server/actions.ts` valida y procesa las operaciones; `repository.ts` contiene consultas parametrizadas. `model.ts` comparte los tipos, las reglas del formulario y el formato monetario.

Se reutiliza el esquema existente: `pagato.accounts`, `pagato.account_balances`, `pagato.app_users` y `pagato.transactions`. No hace falta una migración adicional para este módulo.

Cada consulta comprueba la sesión vigente en Neon Auth y el propietario financiero. El navegador no decide el `user_id`. Las cuentas se identifican por UUID; repetir una solicitud de creación con el mismo UUID no añade otra fila. Las ediciones y cambios de estado incluyen la versión `updated_at`: una pantalla desactualizada no sobrescribe cambios posteriores.

Los importes permanecen como texto decimal y `numeric(19,4)` en PostgreSQL. Las sumas de presentación usan enteros de precisión arbitraria, no cálculos de dinero con coma flotante. Si la cuenta ya tiene movimientos, las consultas y el formulario impiden cambiar tipo, moneda o saldo inicial; sí permiten modificar los metadatos. El módulo de transacciones deberá coordinar las escrituras concurrentes y rechazar nuevas operaciones sobre cuentas archivadas.

**Antes de producción:** la conexión actual usa `neondb_owner`, que puede omitir RLS. Los filtros explícitos de sesión y propietario están probados, pero no sustituyen configurar y verificar un rol de aplicación limitado. Este módulo no modifica roles, permisos ni tablas gestionadas por Neon Auth.

## Diseño

Referencias: `Fase 2 Diseño/Mint Flow UI/Desktop/03_Cuentas_Desktop.svg` y `Mobile/03_Cuentas_Mobile.svg`. Se reutilizan el logo oficial y Manrope, los verdes Mint Flow, los fondos suaves y las tarjetas redondeadas. En escritorio hay barra lateral; en móvil, navegación inferior y formularios en panel desplazable. Los controles principales tienen al menos 44 px y las transiciones respetan la preferencia de movimiento reducido. Los módulos futuros aparecen como «Próximamente», sin enlaces funcionales.

## Prueba manual

1. Desde `fase-3-desarrollo/app`, ejecuta `npm run dev` e inicia sesión.
2. Entra al panel y pulsa «Ir a mis cuentas»; también puedes abrir `http://localhost:3000/accounts`.
3. Crea «Efectivo de prueba» con DOP y saldo inicial `1500.50`. Comprueba que aparece la tarjeta y el total.
4. Abre el detalle y edita nombre, institución y color. Recarga la página: los cambios deben persistir.
5. Crea una cuenta USD: sus saldos deben aparecer por separado, nunca sumados al total DOP.
6. Intenta enviar un nombre vacío o un importe con más de cuatro decimales. Debe mostrarse un error y conservarse el resto del formulario.
7. Archiva una cuenta desde el detalle. Debe desaparecer del filtro «Activas», seguir en «Archivadas» y quedar excluida de los totales. Reactívala para recuperar su estado activo.
8. Prueba búsqueda, filtros y «Limpiar filtros». Las cuentas no se borran al filtrar.
9. Abre la misma cuenta en dos pestañas. Guarda un cambio en la primera e intenta guardar el formulario anterior de la segunda: debe pedir actualizar, sin sobrescribir.
10. Sin iniciar sesión, visita `/accounts`: debe llevarte al acceso. Con otro usuario, solo deben aparecer sus propias cuentas.

Para móvil, usa la emulación del navegador a 390 × 844 y 320 px de ancho. Repite creación, validación, detalle y archivado; comprueba que puedes desplazar el formulario hasta los botones sin desplazamiento horizontal. Es emulación: todavía conviene repetirlo en un teléfono real, con teclado virtual y navegador habitual. Para acceso desde un teléfono, sigue las indicaciones HTTPS de `PRUEBAS_AUTENTICACION.md`; abrir simplemente una IP HTTP puede impedir APIs de autenticación y generación segura de UUID.

Las cuentas introducidas manualmente en estas pruebas se guardan de verdad en la base de desarrollo. Usa nombres de prueba y archívalas al terminar; no introduzcas credenciales ni números bancarios.

## Comprobaciones automatizadas

- `npm run check`: lint, tipos y pruebas de validación, cálculo exacto, filtros, acciones y persistencia del formulario ante errores.
- `npm run test:e2e`: regresión de navegación, autenticación y protección de `/accounts` en Chromium de escritorio y móvil; no crea cuentas autenticadas.
- `npm run test:accounts:db`: ocho escenarios sobre la rama de desarrollo configurada. Comprueba creación idempotente, precisión y lectura, edición, versiones obsoletas, archivado, reactivación, sesión inválida, aislamiento entre propietarios y protección del saldo con movimientos.
- `npm run build`: compilación de producción; compilar no significa estar listo para publicar.

La integración requiere Node.js 24, `.env.local` y una sesión de prueba vigente. Si hay varios perfiles con sesión, configura `PAGATO_TEST_AUTH_SUBJECT` con el ID de Auth del usuario de prueba. El script restringe el destino a la rama de desarrollo prevista y termina cada escenario con un rollback intencional. No imprime tokens ni deja cuentas o movimientos de prueba persistidos.
