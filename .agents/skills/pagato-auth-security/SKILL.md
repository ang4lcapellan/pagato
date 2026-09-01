---
name: pagato-auth-security
description: Diseña, implementa o revisa autenticación, sesiones, recuperación de cuenta y autorización de PagaTo. Úsala al trabajar con registro, inicio o cierre de sesión, cookies, roles, rutas protegidas y acceso a recursos de usuarios.
---

# Autenticación y autorización de PagaTo

Protege la identidad y evita acceso horizontal a información financiera de otros usuarios.

## Identidad y sesión

- Prefiere una biblioteca de autenticación mantenida sobre una implementación criptográfica propia.
- Valida la sesión en el servidor para cada operación protegida.
- Usa cookies HttpOnly, Secure en producción y SameSite apropiado; limita ruta, dominio y duración.
- Rota identificadores de sesión después de iniciar sesión o elevar privilegios.
- Invalida la sesión del servidor al cerrar sesión cuando el mecanismo elegido lo permita.
- No almacenes tokens de sesión en localStorage ni los expongas a JavaScript si una cookie segura puede cumplir la función.
- Protege solicitudes con cookies contra CSRF mediante las defensas del framework, verificación de origen o tokens según el flujo.

## Autorización y propiedad

- Deriva el usuario y sus permisos de la sesión verificada.
- Ignora identificadores de propietario enviados por el cliente al crear recursos.
- Incluye el propietario autenticado en la consulta que lee, modifica o elimina cada cuenta, transacción, categoría o presupuesto.
- Responde de forma indistinguible para recurso inexistente y recurso ajeno cuando revelar su existencia aumente el riesgo.
- Protege acciones y APIs aunque la ruta o el botón también estén ocultos en la interfaz.
- Evita autorización basada únicamente en middleware de navegación; compruébala en el caso de uso o acceso a datos.

## Registro y credenciales

- Si la aplicación maneja contraseñas, usa el hash adaptativo proporcionado por una biblioteca mantenida; nunca cifrado reversible ni hash rápido.
- Aplica límites razonables y permite contraseñas largas; no alteres silenciosamente el valor.
- Evita revelar si un correo está registrado en recuperación y otros flujos sensibles.
- Aplica rate limiting por capas a login, registro, recuperación y verificación, evitando bloquear permanentemente a un usuario legítimo.

## Recuperación y verificación

- Genera tokens aleatorios, de un solo uso y corta duración.
- Guarda un hash del token cuando sea viable y consume el token de forma atómica.
- Invalida tokens anteriores al emitir uno nuevo y sesiones existentes después de un cambio de credenciales si el riesgo lo justifica.
- Construye enlaces con un origen permitido por configuración; no confíes en encabezados Host no validados.

## Pruebas mínimas

- Acceso sin sesión.
- Sesión inválida o expirada.
- Usuario A intentando leer, modificar o eliminar un recurso de B.
- Alteración de userId, ownerId, rol o identificadores.
- Reutilización y expiración de tokens de recuperación.
- CSRF y límites de intentos en endpoints sensibles cuando aplique.

No elijas un proveedor ni cambies el modelo de sesión si esa decisión sigue abierta y no forma parte de la tarea.
