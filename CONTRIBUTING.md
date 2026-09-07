# Flujo de trabajo de PagaTo'

Este repositorio utiliza un flujo simple de dos ramas permanentes. La separación evita que cambios en desarrollo afecten los datos reales y mantiene el despliegue de producción trazable.

## Ramas permanentes

| Rama | Propósito | Base de datos | Despliegue |
| --- | --- | --- | --- |
| `develop` | Integración y validación de cambios | Neon `development` | Preview de Vercel |
| `main` | Código estable para usuarios finales | Neon `production` | Production de Vercel |

Las ramas `feature/*`, `fix/*` y `chore/*` son temporales. Se crean desde `develop`, se revisan mediante Pull Request y se eliminan después de fusionarlas. No se trabaja directamente sobre `main`.

La carpeta técnica usa nombres sin espacios (`fase-3-desarrollo`) para que los empaquetadores de Vercel y las herramientas de CI generen funciones portables en cualquier entorno.

Dependabot puede crear ramas temporales para actualizaciones de npm. Las actualizaciones están agrupadas para limitar el número de Pull Requests abiertos; solo deben fusionarse cuando los checks de seguridad y pruebas estén en verde.

## Flujo recomendado

```text
feature/* → develop → Pull Request → main → Vercel Production
                 ↘ Neon development       ↘ Neon production
```

1. Crea una rama corta desde `develop` (`feat/nombre`, `fix/nombre` o `chore/nombre`).
2. Ejecuta las comprobaciones locales desde `fase-3-desarrollo/app`:

   ```bash
   npm run check
   npm run build
   npm run security:secrets
   ```

3. Abre el Pull Request hacia `develop` y espera los checks de GitHub Actions.
4. Después de validar la funcionalidad y la migración de base de datos, fusiona `develop` en `main`.
5. Confirma en Vercel que el despliegue Production terminó en estado `Ready`.

## Qué significa un `Failed` en GitHub

GitHub conserva el historial de cada intento de despliegue. Un `Failed` antiguo no cambia la versión que está sirviendo el dominio: solo indica que ese intento no pudo publicar sus salidas. La referencia operativa es el despliegue más reciente de Vercel asociado a `main` y su estado `Ready`.

Los fallos de compilación deben corregirse antes de fusionar. Los fallos históricos no se pueden convertir retroactivamente en `Success`; quedan como auditoría y los siguientes despliegues correctos aparecen en verde.

## Datos y secretos

- Nunca subas `.env.local`, claves API, contraseñas ni URLs de conexión.
- Las migraciones se ejecutan primero en Neon `development` y luego en Neon `production` durante una promoción revisada.
- El frontend y las rutas API viven en `fase-3-desarrollo/app`; las migraciones y verificaciones están en `fase-3-desarrollo/database`.
