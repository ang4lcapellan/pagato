# Validación y errores

FluentValidation cubre correo, password, longitudes, monedas ISO de tres letras, importes positivos, periodos, thresholds y origen/destino. Las reglas de dominio y constraints PostgreSQL actúan como defensas adicionales.

Los errores de request usan Validation Problem Details. Las excepciones no controladas devuelven un mensaje neutro, status 500 y correlation ID; no incluyen stack trace, SQL ni secretos. Serilog registra método, ruta, status y duración sin registrar cuerpos sensibles.

