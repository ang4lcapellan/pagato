---
name: pagato-security-review
description: Audita cambios de PagaTo antes de integrar, desplegar o publicar y produce hallazgos accionables. Úsala cuando se solicite revisión, hardening, análisis de riesgos, preparación de release o investigación de una posible vulnerabilidad.
---

# Revisión de seguridad de PagaTo

Trabaja en modo de revisión de solo lectura salvo que el usuario también solicite corregir.

## Alcance

1. Identifica los archivos, diff, flujo o release realmente incluidos.
2. Determina qué datos y límites de confianza cambian.
3. Prioriza vulnerabilidades explotables y regresiones sobre recomendaciones cosméticas.
4. No realices acciones contra producción, pruebas intrusivas ni rotaciones de credenciales sin autorización explícita.

## Áreas de revisión

- Secretos: archivos .env, claves, tokens, URLs con credenciales, logs, fixtures y código cliente.
- Autenticación: sesión, cookies, CSRF, recuperación, rate limiting y cierre de sesión.
- Autorización: aislamiento por propietario, IDOR, roles y acciones ocultas solo en cliente.
- Entradas: validación servidor, límites, carga de archivos, redirecciones y URLs.
- Datos: consultas parametrizadas, transacciones, concurrencia, precisión monetaria y minimización de respuestas.
- Web: XSS, HTML no confiable, CSP y encabezados relevantes, CORS limitado y errores sin detalles internos.
- PWA: ausencia de credenciales y datos financieros en precache, Cache Storage y respuestas reutilizables.
- Dependencias: paquetes innecesarios, lockfile coherente, vulnerabilidades conocidas y scripts de instalación.
- Privacidad: PII o información financiera en registros, analítica, monitoreo, exportaciones y respaldos.
- Pruebas: casos negativos de sesión, autorización, validación, recuperación y concurrencia.

## Método

- Empieza por el diff y sigue las rutas de datos hasta el servidor y PostgreSQL.
- Usa búsqueda dirigida para secretos y patrones peligrosos sin imprimir valores sensibles.
- Ejecuta análisis estático, pruebas y auditoría de dependencias disponibles cuando sean proporcionales y no requieran cambios externos.
- Verifica cada hallazgo con evidencia concreta; evita afirmaciones basadas solo en ausencia de contexto.

## Prioridad

- P0: explotación activa o exposición inmediata de secretos/datos.
- P1: acceso no autorizado, pérdida o corrupción financiera probable.
- P2: debilidad explotable con condiciones adicionales.
- P3: endurecimiento valioso con riesgo inmediato bajo.

## Entrega

Presenta primero los hallazgos ordenados por prioridad. Para cada uno incluye archivo y línea, escenario de abuso, impacto y corrección mínima. No reproduzcas secretos.

Después indica:

- verificaciones ejecutadas y su resultado;
- controles correctos observados;
- riesgos residuales o partes no verificables;
- decisión final: bloquear, corregir antes de release o aceptar con seguimiento.

Si no encuentras vulnerabilidades, dilo explícitamente sin afirmar seguridad absoluta.
