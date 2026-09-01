---
name: pagato-data-api-security
description: Protege datos financieros, validaciones, consultas PostgreSQL y endpoints internos de PagaTo. Úsala al crear o modificar formularios, Server Actions, Route Handlers, servicios, repositorios, esquemas, migraciones o lógica monetaria.
---

# Seguridad de datos y API de PagaTo

Preserva confidencialidad, integridad y consistencia de los datos financieros.

## Entrada y contratos

- Valida de nuevo en el servidor con Zod o un mecanismo equivalente, aunque el cliente ya valide.
- Usa esquemas de lista permitida y elimina o rechaza campos inesperados según el contrato.
- Impone límites de longitud, rangos, formatos, enumeraciones y tamaño de payload.
- Normaliza únicamente cuando la transformación sea inequívoca; no corrijas silenciosamente importes o monedas.
- No aceptes campos controlados por el servidor como ownerId, userId, saldo calculado, rol o timestamps de auditoría.

## Propiedad y minimización

- Obtén la identidad desde la sesión y aplica el filtro de propietario dentro de cada consulta.
- Selecciona solo las columnas necesarias y devuelve DTOs explícitos.
- No expongas hashes, tokens, secretos, metadatos internos ni información de otros usuarios.
- Pagina y limita listados; establece máximos en filtros, rangos de fechas y exportaciones.

## PostgreSQL y ORM

- Usa operaciones parametrizadas de Prisma o Drizzle. Para SQL crudo, exige parámetros enlazados y una justificación concreta.
- Define claves foráneas, restricciones NOT NULL, unicidad y CHECK que respalden las invariantes importantes.
- Usa transacciones para transferencias y cambios relacionados; una operación parcial no puede modificar el balance.
- Diseña actualizaciones sensibles para evitar doble envío y condiciones de carrera mediante idempotencia, versión o bloqueo apropiado.
- No uses permisos de base de datos más amplios de lo necesario para la aplicación o las migraciones.

## Dinero y tiempo

- Nunca uses punto flotante binario para dinero.
- Usa unidades menores enteras o un decimal exacto con escala y redondeo explícitos.
- Conserva el código de moneda y rechaza operaciones ambiguas entre monedas.
- Guarda instantes en UTC y aplica zona horaria solo al presentar o interpretar fechas de negocio.
- Calcula balances y totales en el servidor a partir de datos autorizados.

## Respuestas, errores y registros

- Usa códigos HTTP coherentes sin revelar consultas, stack traces, rutas internas o existencia de recursos ajenos.
- Registra identificadores de correlación y eventos útiles, no cuerpos financieros completos.
- Redacta correo, tokens, cookies y atributos sensibles.
- Añade Cache-Control: no-store a respuestas financieras o de autenticación cuando corresponda.
- Excluye endpoints y JSON privado del precache y del runtime cache del service worker.

## Pruebas mínimas

- Payload válido e inválido, campos extra y límites.
- Acceso a un recurso de otro usuario.
- Importes cero, negativos, máximos, redondeo y moneda incompatible.
- Doble envío, concurrencia y rollback de transferencias.
- Respuesta sin campos internos y ausencia de caché privada.
