---
name: pagato-secrets
description: Gestiona de forma segura variables de entorno, claves, tokens y credenciales de PagaTo. Úsala al configurar bases de datos, autenticación, correo, proveedores externos, CI/CD o despliegues y al investigar una posible filtración.
---

# Secretos y claves de PagaTo

Evita que una credencial real llegue al navegador, al repositorio o a una salida visible.

## Clasificación

Trata como secreto cualquier contraseña, token, clave privada, cadena de conexión, secreto de sesión, credencial OAuth, clave de cifrado o credencial de proveedor. Considera pública toda variable incluida en un bundle del navegador.

## Reglas de almacenamiento

- Desarrollo local: usa archivos locales ignorados por Git, preferentemente .env.local.
- Repositorio: conserva solamente .env.example con nombres y valores ficticios inequívocos.
- Producción y CI/CD: usa el gestor de secretos de la plataforma y aplica mínimo privilegio por ambiente.
- Separa desarrollo, pruebas, staging y producción. Nunca reutilices credenciales de producción localmente.
- Confirma que .env*, excepto ejemplos explícitos, esté cubierto por .gitignore.

## Límite Next.js

- Solo usa el prefijo NEXT_PUBLIC_ para datos deliberadamente públicos.
- Nunca pongas secretos de autenticación, base de datos o proveedores en variables públicas.
- Accede a secretos únicamente desde módulos de servidor y evita reexportarlos hacia componentes cliente.
- Valida al iniciar que las variables requeridas existen y tienen formato válido, sin imprimir sus valores.
- No serialices objetos de configuración del servidor hacia props, HTML, errores o respuestas.

## Creación y uso

- Genera claves con un generador criptográficamente seguro y entropía apropiada para el proveedor.
- No escribas valores reales en documentación, ejemplos, pruebas, comandos compartidos o conversaciones.
- No pases secretos por argumentos de línea de comandos cuando puedan quedar en historial o listas de procesos.
- No registres encabezados Authorization, cookies, tokens de recuperación, cadenas de conexión ni cuerpos sensibles.
- Redacta valores sensibles antes de enviarlos a monitoreo.

## Revisión antes de integrar

1. Revisa archivos nuevos, el diff y el área staged en busca de .env, tokens, llaves PEM, URLs con credenciales y valores de ejemplo plausibles.
2. Verifica que .env.example use marcadores como replace-me y nunca datos funcionales.
3. Comprueba que ninguna variable secreta sea importada por código cliente.
4. Informa únicamente nombres de variables y ubicación; nunca repitas el valor encontrado.

## Sospecha de filtración

1. No muestres ni copies el secreto.
2. Trátalo como comprometido aunque el commit sea privado.
3. Recomienda revocación o rotación en el proveedor antes de limpiar el historial.
4. No rotes credenciales ni reescribas el historial sin autorización explícita.
5. Después de la rotación, elimina la referencia, revisa usos relacionados y documenta el incidente sin incluir el valor.
