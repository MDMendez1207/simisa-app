# Desafío NASA Space Apps 2026

**Challenge:** *Create Health Monitoring Software for Astronauts on Space Missions*
**Página oficial:** <https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/>
**Evento:** NASA Space Apps Challenge 2026, tema global “The Next Frontier”, 14 y 15 de noviembre de 2026. Dificultad: intermedio. Áreas: software, exploración espacial.

> Fecha de esta nota: 14 de noviembre de 2026. El enunciado y la pestaña **Resources** fueron copiados de la página oficial por el usuario, porque la página no respondía desde el equipo de desarrollo.

## Enunciado oficial

> **Create Health Monitoring Software for Astronauts on Space Missions**
>
> Long-duration missions expose astronauts to space radiation, isolation and confinement, altered gravity, and a hostile closed environment, which can bring immune changes, bone loss, cardiovascular events, and behavioral health problems. On long missions, astronauts carry much of the responsibility for spotting these changes in themselves. Your challenge is to build a health monitoring software that gathers health indicators and enables astronauts to evaluate and act on the status of their health.

### Background

> With rising investment in spacecraft technology and research, space missions have become more ambitious. NASA’s Artemis program recently accomplished a crewed lunar flyby, and NASA and others have plans to send humans to Mars in the future. With increasingly longer missions, astronauts will be more exposed to the hostile space environment, which brings both physical and mental health risks.
>
> NASA’s Human Research Program has mapped the five hazards of human spaceflight, which are space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile closed environments. These hazards can contribute to health problems such as immune system changes, bone density loss, cardiovascular events, inadequate nutrition, behavioral health conditions, and others. Astronauts must be capable of making health assessments on themselves during a mission, to prevent and treat health problems that may arise. Some useful health indicators are blood pressure, heart rate, blood sugar, body temperature, daily sleep hours, and mood.

### Objectives

> Your challenge is to create a visual tool that helps astronauts assess their own health during space missions and provides guidance on treatments and health improvements. You may consider gathering data from the user through any kind of input—keyboard text, mouse clicks, or camera images, for example. Any kind of data can be used, as long as it represents a health indicator, such as blood sugar levels in mg/dL or ultrasound images.
>
> You can use NASA’s Human Research Program resources, along with the publicly available resources from other space agencies, to understand how spaceflight hazards affect human health, and to decide which indicators are useful and how they can support a quick assessment. Which measurements can be performed in space? Why is an exam needed? How do spaceflight hazards affect these health indicators? When might a result warrant attention from the crew or from flight surgeons on the ground? What actions can be taken to prevent a critical health condition? These are questions worth considering as you develop your solution.
>
> User interface design plays an important role in presenting metrics and diagnosis clearly. You may consider taking advantage of animations and interactivity to present the information. For example, the software could display a human figure where each part of the body is clickable and displays information about its function and health status.

### Potential Considerations

> You may (but are not required to) consider the following:
>
> - Your tool could provide health insights for astronauts in different environments, such as a spacecraft, a space station, a rover, or a base on another planet or moon.
> - Your tool could prompt astronauts to take measurements or complete specific actions from time to time as a part of the mission routine.
> - Your tool could include the following features:
>   - A gamification system to help astronauts engage with tasks that support their health
>   - Dynamic charts that show how astronaut’s health indicators change over time
>   - Color coding that helps the astronaut interpret the status of a health indicator at a glance
> - Do not assume that astronauts know everything about how to assess their health. Your tool could provide simple instructions and explanations covering measurements, health indicators, and risks.
>
> For data and resources related to this challenge, refer to the Resources tab at the top of the page. More resources may be added before the hackathon begins.

## Síntesis en español

- **Problema:** en misiones largas, los astronautas deben detectar por sí mismos cambios de salud física y mental causados por el entorno espacial.
- **Contexto:** Artemis ya realizó un sobrevuelo lunar tripulado y hay planes para ir a Marte. El Human Research Program de NASA define cinco peligros: **radiación, aislamiento y confinamiento, distancia a la Tierra, campos de gravedad y ambientes cerrados hostiles**. Pueden causar cambios inmunológicos, pérdida de densidad ósea, eventos cardiovasculares, **nutrición inadecuada** y problemas de salud conductual, entre otros ([NASA HRP · Five Hazards](https://www.nasa.gov/hrp/hazards/)).
- **Indicadores sugeridos:** presión arterial, frecuencia cardíaca, glucosa en sangre, temperatura corporal, horas de sueño diarias y estado de ánimo.
- **Objetivo:** una herramienta **visual** para que el astronauta evalúe su propia salud y reciba **orientación sobre tratamientos y mejoras de salud**. Se admite cualquier entrada (teclado, clics, imágenes de cámara) y cualquier dato que represente un indicador (por ejemplo, glucosa en mg/dL o imágenes de ecografía).
- **Investigación:** usar recursos del HRP de NASA y de otras agencias para elegir indicadores útiles para una **evaluación rápida**.
- **Preguntas guía:** qué mediciones se pueden hacer en el espacio; por qué hace falta un examen; cómo afectan los peligros a cada indicador; cuándo un resultado merece la atención de la tripulación o de los médicos de vuelo en Tierra (*flight surgeons*); qué acciones previenen una condición crítica.
- **Interfaz:** métricas y diagnóstico claros, con animación e interactividad. Ejemplo explícito: **figura humana con partes clicables** que muestran función y estado de salud.
- **Opcional:** distintos entornos (nave, estación, rover, base); recordatorios de medición y rutina; gamificación; gráficas dinámicas; código de colores; instrucciones y explicaciones simples.
- **Recursos:** pestaña Resources de la página oficial.

## Recursos oficiales del desafío (pestaña Resources)

Copiados de la página oficial por el usuario.

| Recurso | Descripción | Uso en SIMISA |
| --- | --- | --- |
| [NASA · 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) | Información básica del HRP sobre los peligros principales, con enlaces a artículos e informes por peligro | **Usado:** los cinco peligros en Información médica y en la guía de cada indicador (`shared/health-guide.js`) |
| [NASA · Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/) | Información básica del HRP sobre los riesgos de salud, con enlaces por riesgo | **Usado:** nueve riesgos citados por la guía (cardiovascular, aptitud física, hipoxia, inmunidad, nutrición, hueso, sueño, conducta, trabajo en equipo) |
| [NASA · Ongoing HRP Research in Space](https://www.nasa.gov/hrp/ongoing-hrp-research/) | Artículos de investigaciones en curso del HRP | Enlazado en Fuentes |
| [CSA · Monitoring Radiation for Astronaut Health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | Tecnologías e investigación canadienses para medir la exposición a la radiación | Enlazado en Fuentes; dosímetro y tasa de dosis sintéticos en µSv/h, sin validación ni umbrales de seguridad derivados de esta fuente |
| [CSA · Why Do We Conduct Science Experiments in Space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) | Por qué la investigación en la ISS sirve a la salud humana y a la exploración | Enlazado en Fuentes |

Las páginas de NASA HRP se consultaron el 14 de noviembre de 2026; las de la CSA no respondieron desde el equipo de desarrollo.

## Otras fuentes consultadas (secundarias)

- La guía del evento local de Belo Horizonte recuerda que **para los premios globales es obligatorio usar al menos un recurso de la pestaña Resources** ([PDF de desafíos BH 2026](https://santamaria.pucminas.br/wp-content/uploads/2026/11/Desafios-NASA-Space-Apps-Challenge-BH-2026.pdf)).
- Una consulta pública indica que los recursos específicos del desafío se publicarían el 13 de noviembre de 2026 ([nasa/spaceapps · Discussion #1772](https://github.com/nasa/spaceapps/discussions/1772)).

## Cómo responde SIMISA

### Objetivo y antecedentes

| Pide el desafío | Qué hace SIMISA | Estado |
| --- | --- | --- |
| Herramienta visual de autoevaluación | Panel general, figura anatómica, gráficas y Centro de tripulación | Sí |
| Indicadores sugeridos: presión, pulso, glucosa, temperatura, sueño, ánimo | Los seis están presentes (ánimo en el chequeo psicológico), más respiración, SpO₂, densidad ósea y estrés percibido | Sí |
| Evaluación rápida | Tarjetas con valor, color y estado (“En rango”, “Fuera de rango”); “Estable / Requiere atención” por tripulante | Sí |
| Entrada del usuario (teclado, clics, cámara) | Chequeo psicológico con teclado y clics; signos vitales solo de sensores simulados, por decisión del proyecto. Sin imágenes de cámara | Parcial |
| Orientación sobre tratamientos y mejoras de salud | Ficha “Qué hacer ahora” según el estado de cada indicador: prevención general citada de NASA HRP y escala autocuidado → médica de tripulación → consulta a Tierra. No indica tratamientos ni dosis ([Decisiones](decisiones.md)) | Parcial (sin tratamientos) |
| Pérdida ósea | Densidad ósea periódica con leve descenso durante el historial | Sí |
| Eventos cardiovasculares | Pulso y presión con alertas fuera de referencia | Sí |
| Salud conductual, aislamiento y confinamiento | Chequeo psicológico diario; en la demo, el estrés de un tripulante aumenta antes del episodio | Sí |
| Ambiente cerrado hostil | Episodio respiratorio preparado (SpO₂, respiración y pulso relacionados) | Sí (simulado) |
| Distancia a la Tierra | Informes para Tierra y supervisión a bordo por comandante y médica; no se simula la demora de comunicación | Parcial |
| Radiación | Dosímetro personal y tasa de dosis sintética en µSv/h, guardada por tripulante y agrupada en Abdomen como categoría de navegación; sin dosis acumulada ni evaluación de riesgo | Parcial |
| Cambios inmunológicos, nutrición | Sin indicadores ni simulación específicos | No |

### Preguntas guía

| Pregunta | Estado en SIMISA |
| --- | --- |
| ¿Qué mediciones se pueden hacer en el espacio? | **Sí:** “Cómo se mide” en cada indicador (dispositivo, frecuencia y condiciones). |
| ¿Por qué hace falta un examen? | **Sí:** “Por qué se mide en el espacio” en cada indicador, en Salud corporal, Panel general, Gráficas e Información médica. |
| ¿Cómo afectan los peligros a los indicadores? | **Sí:** cada indicador enlaza sus peligros y riesgos de NASA HRP; Información médica presenta los cinco peligros. |
| ¿Cuándo merece atención un resultado? | **Sí, con referencias ilustrativas:** fuera de referencia → avisar a la médica de tripulación; más de 10 min seguidos (o dos registros diarios seguidos) → la médica evalúa consultar a Tierra. Es una regla de la demo, no un criterio clínico. |
| ¿Qué acciones previenen una condición crítica? | **Parcial:** prevención general por indicador (ejercicio, descanso, alimentación, procedimientos de caminata espacial) y acciones de dispositivo. Sin tratamientos. |

### Interfaz y consideraciones opcionales

| Consideración | Estado en SIMISA |
| --- | --- |
| Figura humana clicable con función y estado | **Sí:** Salud corporal, seis regiones con su función, lecturas, gráfica y ficha “Qué hacer ahora”; zoom y desplazamiento. |
| Animación e interactividad | **Sí:** reloj de misión reproducible que avanza todas las vistas; zoom anatómico; gráficas por período. |
| Gráficas dinámicas en el tiempo | **Sí:** de 1 h a 14 días, media con franja mínimo–máximo, marca de inicio de la ejecución. |
| Código de colores | **Sí:** verde, naranja y rojo en lecturas, tripulación, dispositivos y alertas. |
| Instrucciones y explicaciones simples | **Sí:** qué hacer, por qué se mide, cómo se mide y riesgos por indicador; “¿A quién recurrir?” en Información médica. |
| Recordatorios de medición o rutina | **No.** Solo el chequeo psicológico, sin recordatorio. |
| Gamificación | **No.** |
| Distintos entornos (nave, estación, rover, base) | **No.** Una sola misión ficticia, sin perfil de entorno. |

## Brechas principales y posibles mejoras

1. ~~Orientación y explicaciones por indicador~~ — **hecho** con NASA HRP (`shared/health-guide.js`). Queda fuera el tratamiento: requiere protocolos clínicos revisados.
2. **Recordatorios de rutina:** chequeo psicológico pendiente, densitometría programada, cargar un dispositivo.
3. **Gamificación ligera:** por ejemplo, racha de chequeos completados.
4. **Entorno de misión:** etiqueta de entorno (estación, base lunar) y demora de comunicación con Tierra.

## Otros pendientes

- **Recurso de NASA para premios globales:** cubierto con *5 Hazards of Human Spaceflight* y *Risks of Human Spaceflight* (ver Recursos oficiales). Mencionarlo en la presentación.
- **Datos:** mediciones sintéticas y referencias ilustrativas; sin validación clínica ni diagnóstico ([Decisiones](decisiones.md)).
- **Entrega:** cierre general el 15 de noviembre de 2026 a las 23:59 (hora local). Según una consulta pública, la presentación es de 7 diapositivas o un video de hasta 30 segundos, en inglés; confirmarlo en la [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/). La interfaz está en español.
