# Herramientas utilizadas y declaración de uso de IA

Actualizado: 15 de noviembre de 2026.

Este inventario describe la construcción de la aplicación activa en `simisa-app/`, a partir del código, la documentación de procedencia y el historial de trabajo disponible. Los materiales originales de SIMISA se conservaron como referencia.

## Tecnologías de la aplicación

| Herramienta o tecnología | Uso en SIMISA | Evidencia en el proyecto |
| --- | --- | --- |
| JavaScript con módulos ES | Motor de simulación, consultas compartidas, servidor, CLI e interfaz | [`package.json`](../../package.json), [`engine/simulator.js`](../../engine/simulator.js) y [`web/js/main.js`](../../web/js/main.js) |
| Node.js ≥ 22 | Ejecución local, simulador independiente y función de simulación para la web de muestra | [`package.json`](../../package.json), [`server.js`](../../server.js), [`cli.js`](../../cli.js) y [`api/simulate.js`](../../api/simulate.js) |
| HTML y CSS | Estructura, diseño adaptable, tipografía y animaciones de la interfaz | [`web/index.html`](../../web/index.html) y [`web/css/app.css`](../../web/css/app.css) |
| SVG | Gráficas de indicadores, iconos y elementos de navegación anatómica | [`web/js/chart.js`](../../web/js/chart.js) y [`web/views/lateral.html`](../../web/views/lateral.html) |
| PNG y WebP | Ilustraciones anatómicas y recursos de identidad visual | `web/assets/`; [procedencia de las ilustraciones](../../web/assets/PROCEDENCIA.md) |
| JSON y CSV | Resultados y actividad en archivos locales; exportación de datos e investigación | [`storage/files.js`](../../storage/files.js), [`storage/activity.js`](../../storage/activity.js) y [`web/js/sections.js`](../../web/js/sections.js) |
| Módulos nativos de Node.js | Servidor HTTP (`node:http`), archivos (`node:fs/promises`), huellas SHA-256 (`node:crypto`) y pruebas (`node:test`, `node:assert/strict`) | [`server.js`](../../server.js), [`storage/files.js`](../../storage/files.js) y [`test/simulation.test.js`](../../test/simulation.test.js) |
| npm | Atajos para iniciar, simular, verificar y preparar la publicación | Scripts de [`package.json`](../../package.json) |

La aplicación activa utiliza las funciones del navegador y de Node.js directamente y no declara dependencias externas en `package.json`. Las propuestas de React, Vite, Motion y Recharts de los planes iniciales son antecedentes de diseño; el inventario anterior corresponde a la implementación vigente.

## Desarrollo, revisión y publicación

| Herramienta | Uso o estado registrado |
| --- | --- |
| Windows y PowerShell | Entorno de desarrollo y ejecución de comandos; los accesos `.cmd` permiten iniciar la app y preparar el túnel |
| Git y GitHub | Control de versiones y alojamiento del [repositorio de SIMISA](https://github.com/MDMendez1207/simisa-app) |
| Navegador integrado y Google Chrome | Revisión funcional y visual, tamaños de escritorio y móvil y comprobación de errores de consola; evidencia en [Validación](validacion.md) |
| Vercel | Destino de publicación preparado mediante [`vercel.json`](../../vercel.json), un [script de construcción propio](../../scripts/build-vercel.js) y una función Node.js de simulación; la configuración por sí sola no acredita un despliegue |
| Cloudflare / `cloudflared` | Opción de enlace público temporal implementada en [`Publicar SIMISA.cmd`](../../Publicar%20SIMISA.cmd); la [validación registrada](validacion.md) cubre las restricciones del servidor y deja pendiente la prueba del túnel real |
| OpenCode | Configuración auxiliar presente en `../.opencode/`, con el complemento `@opencode-ai/plugin` 1.19.5 y la política de trabajo `simisa-modo-rapido`; estos archivos pertenecen al entorno de desarrollo |

## Inteligencias artificiales utilizadas

| IA o herramienta asistida por IA | Participación registrada |
| --- | --- |
| **Codex (OpenAI)** | Asistencia para analizar el plan y los originales, organizar la implementación, escribir y revisar código, preparar y ejecutar verificaciones y redactar documentación, siguiendo las indicaciones del responsable del proyecto |
| **Generación de imágenes integrada de Codex (OpenAI)** | Creación de las ilustraciones anatómicas del cuerpo y sus detalles, variantes y correcciones visuales. La [procedencia](../../web/assets/PROCEDENCIA.md) y los [prompts de generación y corrección](../../web/assets/PROMPTS.json) se conservan junto a los recursos |

Los materiales disponibles identifican las herramientas, pero no registran de forma verificable la versión exacta del modelo de lenguaje, el modelo de imágenes ni el proveedor o modelo seleccionado en OpenCode. La configuración de OpenCode se incluye como evidencia del entorno, sin atribuirle un modelo específico.

### Alcance de la IA en el producto

La asistencia de IA se utilizó durante la construcción del proyecto. En la aplicación, el «Asistente inteligente» utiliza [respuestas y consultas locales programadas](../../web/js/presentation.js) sobre las lecturas, el período seleccionado y los chequeos psicológicos. Su funcionamiento no requiere una API de IA generativa.

El [motor sintético](../../engine/simulator.js) genera mediciones mediante reglas y semillas reproducibles. Los datos de cada ejecución proceden de ese motor. Las ilustraciones generadas con IA son recursos conceptuales 2D con los límites descritos en su [documento de procedencia](../../web/assets/PROCEDENCIA.md).

## Declaración de uso de IA para la entrega

Durante el desarrollo de SIMISA se utilizó Codex de OpenAI como asistencia para el análisis de los materiales, la programación, la revisión del código, las verificaciones y la documentación. Las ilustraciones anatómicas fueron generadas con la herramienta de imágenes integrada de Codex; se conservaron su procedencia y sus prompts. Las decisiones de alcance y los requisitos fueron definidos por el responsable del proyecto. Las mediciones se generan con un simulador sintético reproducible y el asistente de la aplicación responde mediante consultas locales programadas. El prototipo y sus ilustraciones tienen finalidad demostrativa y no cuentan con validación clínica.
