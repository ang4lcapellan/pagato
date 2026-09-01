---
name: pagato-secure-development
description: Desarrolla o modifica funciones de PagaTo con controles de seguridad desde el diseño. Úsala al implementar, refactorizar o integrar código Next.js, TypeScript, PWA o PostgreSQL; no sustituye una auditoría de seguridad solicitada explícitamente.
---

# Desarrollo seguro de PagaTo

Aplica seguridad por defecto sin ampliar el alcance funcional del cambio.

## Contexto permanente

- PagaTo es una PWA financiera construida como monolito modular con Next.js, React, TypeScript y PostgreSQL.
- Prisma frente a Drizzle y el proveedor de autenticación pueden seguir pendientes. Conserva esas decisiones salvo que la tarea pida resolverlas.
- Los datos de cuentas, transacciones, presupuestos y preferencias son privados y siempre pertenecen a un usuario autenticado.
- El cliente, el navegador, la PWA y todos sus datos de entrada son no confiables.

## Antes de editar

1. Identifica datos sensibles, entradas no confiables, operaciones financieras y límites cliente/servidor afectados.
2. Define las invariantes de seguridad observables del cambio.
3. Revisa las convenciones existentes y evita introducir una segunda solución de autenticación, validación o acceso a datos.
4. Si el cambio toca secretos, autenticación o persistencia, aplica además la skill especializada correspondiente.

## Invariantes obligatorias

- Autentica y autoriza en el servidor. La interfaz solo puede mejorar la experiencia; nunca constituye un control de acceso.
- Deriva la identidad del usuario desde una sesión verificada. No confíes en un userId, ownerId o rol enviado por el cliente.
- Limita cada lectura y escritura financiera al propietario autenticado.
- Valida entradas en el límite del servidor con esquemas de lista permitida, límites de longitud y tipos explícitos.
- No expongas secretos en código cliente, respuestas, errores, registros, telemetría, capturas, fixtures o commits.
- Devuelve errores seguros al cliente y conserva detalles técnicos únicamente en registros del servidor sin datos sensibles.
- Usa consultas parametrizadas mediante el ORM; no formes SQL con concatenación.
- Agrupa operaciones financieras relacionadas en una transacción atómica y conserva precisión monetaria.
- No almacenes respuestas financieras o credenciales en Cache Storage, service workers ni almacenamiento persistente del navegador.
- Mantén dependencias mínimas y evita desactivar controles del framework para resolver errores rápidamente.

## Flujo de implementación

1. Implementa el cambio mínimo que cumpla el requisito y las invariantes.
2. Añade pruebas positivas y negativas: usuario no autenticado, recurso ajeno, entrada inválida y conflicto de concurrencia cuando aplique.
3. Ejecuta verificaciones proporcionales: tipos, lint, pruebas y compilación disponibles.
4. Revisa el diff para detectar secretos, permisos demasiado amplios, datos privados enviados al cliente y cambios no relacionados.
5. Informa los controles añadidos, las verificaciones ejecutadas y cualquier riesgo residual.

## Límites

- No inventes, muestres, registres ni confirmes valores de credenciales.
- No rotes, revoques o reemplaces secretos externos sin autorización explícita.
- No reduzcas autenticación, autorización, cifrado o validación para que una prueba pase.
- Si la solución segura requiere una decisión de producto o infraestructura no definida, detén esa parte y presenta la decisión necesaria.
