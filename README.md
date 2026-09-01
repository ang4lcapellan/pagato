# PagaTo'

PagaTo' es una aplicacion web de finanzas personales orientada a ayudar a sus usuarios a registrar, organizar y comprender sus ingresos y gastos de forma sencilla.

El producto se desarrollara como una **Progressive Web App (PWA)**, por lo que podra utilizarse desde un navegador e instalarse en computadoras y dispositivos moviles sin depender inicialmente de Google Play o App Store.

## Estado del proyecto

El proyecto se encuentra en transicion desde el diseno hacia la implementacion tecnica.

- Requerimientos funcionales iniciales: definidos.
- Requerimientos no funcionales iniciales: definidos.
- Arquitectura propuesta: seleccionada.
- Diseno visual inicial: definido.
- Base de datos inicial: definida en `Fase 3 Desarrollo/database`.
- Implementacion de la aplicacion: pendiente de iniciar.

## Objetivo del MVP

Construir una primera version simple y util que permita al usuario administrar su informacion financiera personal desde una misma cuenta, tanto en escritorio como en dispositivos moviles.

El MVP contempla:

- Registro y autenticacion de usuarios.
- Registro de ingresos y gastos.
- Creacion y gestion de cuentas financieras.
- Dashboard con un resumen financiero.
- Historial de transacciones.
- Edicion y eliminacion de transacciones.
- Categorias personalizadas.
- Presupuestos basicos.
- Preferencias de apariencia, idioma y moneda.
- Recuperacion de contrasena y cierre de sesion.

## Arquitectura seleccionada

PagaTo' utilizara inicialmente un **monolito modular full-stack**. Esta arquitectura mantiene la implementacion y el despliegue sencillos, pero separa el sistema por modulos funcionales para facilitar su mantenimiento y crecimiento.

```text
PWA Next.js
|-- Interfaz React
|-- Logica del servidor
|-- API interna
|-- Autenticacion
`-- Acceso a datos
          |
          `-- PostgreSQL
```

### Tecnologias previstas

- Next.js con App Router.
- React.
- TypeScript.
- PostgreSQL.
- Prisma ORM o Drizzle ORM (decision pendiente).
- Auth.js o una solucion equivalente (decision pendiente).
- Tailwind CSS.
- Zod para validaciones.
- Vitest y Playwright para pruebas.
- Web App Manifest y service worker para capacidades PWA.

Las versiones y dependencias concretas se definiran al comenzar la implementacion.

## Modulos iniciales

La aplicacion se organizara alrededor de los siguientes modulos:

- Autenticacion y usuarios.
- Cuentas financieras.
- Transacciones.
- Categorias.
- Presupuestos.
- Dashboard.
- Preferencias.

Cada modulo debera mantener separadas, en la medida necesaria, la interfaz, las validaciones, los casos de uso y el acceso a datos.

## Estrategia PWA

La aplicacion tendra una interfaz responsive e instalable desde navegadores compatibles. En el MVP, el funcionamiento sin conexion se limitara a la carga de la interfaz y a estados informativos.

Las operaciones que modifiquen informacion financiera, como registrar o editar transacciones, requeriran conexion con el servidor para proteger la integridad y consistencia de los datos.

## Principios del proyecto

- Mantener el MVP pequeno y comprensible.
- Priorizar seguridad, privacidad e integridad de los datos.
- Evitar complejidad tecnica que no aporte valor inmediato.
- Utilizar tecnologias aplicables al mercado laboral.
- Mantener una experiencia consistente en web, escritorio y movil.
- Preparar el sistema para crecer sin adoptar microservicios prematuramente.

## Documentacion

El repositorio se organiza por fases:

- `Fase 1 Analisis`: requerimientos funcionales y no funcionales.
- `Fase 2 Diseño`: linea grafica y pantallas de referencia para escritorio y movil.
- `Fase 3 Desarrollo`: base de datos, configuracion tecnica y codigo fuente de la aplicacion.

La documentacion de analisis incluye:

- 15 requerimientos funcionales (`PG-01` a `PG-15`).
- 15 requerimientos no funcionales (`RNF-01` a `RNF-15`).

Los secretos y archivos de entorno reales no deben versionarse. `Fase 3 Desarrollo/.env.example` contiene solamente marcadores ficticios para documentar las variables requeridas.

## Proximos pasos

1. Revisar y consolidar los requerimientos.
2. Definir las reglas de negocio y los casos de uso.
3. Diseñar el modelo inicial de datos.
4. Confirmar las herramientas de persistencia y autenticacion.
5. Crear la base tecnica del proyecto.
6. Implementar el MVP por modulos.

## Licencia

La licencia del proyecto aun no ha sido definida.
