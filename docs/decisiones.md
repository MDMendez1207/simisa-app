# Decisiones de implementación

Fecha: 14 de noviembre de 2026. La indicación actual del usuario establece que SIMISA_entrega decide las definiciones incompatibles y autoriza ejecutar las etapas con un simulador independiente.

## Jerarquía de materiales

1. Prioridades actuales: simulación reproducible, archivos recuperables y anatomía conectada a resultados.
2. SIMISA_entrega: nombres, unidades, indicadores y lenguaje visual.
3. SIMISA plan.md: orientación funcional y trazabilidad.
4. docs/simisa: antecedentes, límites científicos y recomendaciones; sus afirmaciones de aplicaciones React y pruebas previas no se consideran evidencia de archivos que no están presentes.

El nuevo proyecto se ubica en `simisa-app`. Ningún archivo fuente original se edita. `fuentes-originales.json` conserva las huellas de los 79 originales.

## Corrección de navegación y presentación

Por indicación posterior del usuario, se restablecen las 13 entradas de navegación de SIMISA_entrega, en el mismo orden. La reducción inicial a ocho entradas fue un recorte de implementación, no una modificación acordada del producto.

La generación, los parámetros, los resultados guardados y los controles de reproducción quedan únicamente en Configuración → Simulación. Las aclaraciones sobre datos sintéticos, alcance científico y procedencia anatómica se reúnen en el detalle “Acerca de los datos y recursos” de ese mismo espacio. La procedencia de las mediciones no cambia ni se elimina de los archivos.

La interfaz de consulta utiliza nombres breves de fuentes, “Dentro/Fuera de referencia” y fechas de adquisición. No repite “demo” en tarjetas, cabecera, regiones, eventos ni tablas. Los selectores temporales de estas vistas sirven para consultar el historial, mientras que velocidad y reproducción se administran desde Configuración.

Las opciones recuperadas consultan datos reales de los archivos: Sueño consulta el sensor de descanso; Bienestar psicológico permite al astronauta registrar su chequeo psicológico manual (estado de ánimo y estrés percibido) y consultar su historial; Asistente utiliza consultas locales guiadas; Investigación calcula estadísticas del perfil y período consultados. Comunicación permite preparar informes y registrar su entrega en bandeja local. Perfiles permite seleccionar el rol local (`Astronauta`, `Equipo médico`, `Investigador`). La restitución del menú no implica conexiones externas ni autenticación de servidor implementadas.

Por indicación expresa del usuario, las mediciones de signos vitales y sueño provienen exclusivamente de sensores médicos y no admiten ingreso manual (`measurement` y `sleep` manuales quedan rechazados). El bienestar psicológico sí se ingresa a mano mediante el chequeo psicológico (`wellbeing`), de donde se obtiene el indicador `stress`.

## Definiciones resueltas

| Tema | Decisión | Procedencia y límite |
| --- | --- | --- |
| Glucosa | `gluc`, mg/dL | Catálogo de SIMISA_entrega; sensor sintético; no se adopta `glucose` del motor separado |
| Presión | `sys` y `dia`, mmHg | Se conservan ambas claves; comparten tiempo y sensor; sistólica mayor que diastólica |
| Hueso | `bmd`, densidad ósea en g/cm² | Se conserva el significado de entrega; medición periódica de sensor; no es QUS convertido |
| Estrés | `stress`, 0–10 | Se conserva `/10`; autoinforme manual del chequeo psicológico (`self_report`), no simulado por sensores |
| Sueño | `sleep`, horas | Sensor sintético diario de descanso; sin ingreso manual; no se inventan fases ni eficiencia |
| Temperatura | `temp`, °C | Magnitud sintética de entrega; sin atribuir equivalencia entre medición dérmica y central |
| Umbrales | `lo` y `hi` de entrega | Referencias ilustrativas, sin respaldo clínico individual acreditado |
| Persona | Ana Torres, ficticia | Perfil de entrega; no se incorpora la tripulación distinta del motor separado |
| Regiones | Cuerpo, pecho, pulmones, abdomen, huesos, cabeza | Asociaciones de entrega; organización de navegación, sin inferir la localización de una alteración |

Las precisiones visibles son 1 decimal para signos y escalas, enteros para presión y 2 decimales para densidad ósea. Se evita el redondeo a un decimal que ocultaba variaciones de bmd.

## Reutilización concreta

- Se copiaron sin cambios las variables y estilos de estructura, componentes, KPI y tablas de SIMISA_entrega. `web/css/app.css` los amplía con legibilidad, adaptación móvil y preferencias de movimiento.
- Se reutilizaron su marca SVG y vista lateral, familia de iconos y utilidades de texto. La navegación ofrece las secciones que tienen comportamiento conectado a archivos.
- `shared/indicadores-original.js` es una copia del catálogo original. El catálogo operativo crea fichas congeladas a partir de él. No se usa su mutación de líneas base ni el generador de curvas por pantalla.
- El dibujo de gráficas se evolucionó a SVG con tiempos de adquisición, observaciones excluidas y discontinuidades. No se mezcla presión, pulso y oxígeno en un mismo eje.
- Se reutilizó Mulberry32 del motor original, pero cada observación tiene una semilla derivada propia. Se evita depender del estado interno de un generador que `reset()` no restauraba.
- No se inventó el contenido del `data/rules.json` ausente. Las bandas provienen de entrega. El nuevo motor no afirma conservar la histéresis o los protocolos del sistema faltante.
- Se copiaron los siete PNG originales, incluida la vista histórica, y los archivos de procedencia/prompts. La web utiliza el cuerpo actualizado y cinco detalles, con controles y etiquetas independientes de los píxeles.

## Coherencia de la simulación

Un reloj único avanza por pasos configurables. Una variable preparada de actividad afecta pulso, respiración y presión; el episodio respiratorio afecta simultáneamente SpO₂, pulso y frecuencia respiratoria. Son relaciones de prueba elegidas para sostener un escenario, sin calibración contra datos de sujetos.

Los períodos elegidos para probar el software en sensores son: 10 s para pulso/respiración/oxigenación, 60 s para temperatura, 300 s para presión y glucosa, un día para sueño y 28 días para densidad ósea. Cada ejecución empieza con una observación sintética de referencia por indicador de sensor (`synthetic-1.1.0` / `entrega-1.1.0`). El estrés percibido (`stress`) no es generado por el motor: se incorpora a partir de los chequeos psicológicos registrados por el astronauta (`captureMethod: 'self_report'`). Los archivos anteriores (`1.0.0`) siguen siendo legibles sin reescribirse, pero sus valores sintéticos de estrés no se presentan como lecturas de sensor. Un paso mayor reduce la frecuencia efectiva; el archivo conserva los tiempos realmente adquiridos.

Las condiciones se evalúan directamente contra las bandas de entrega, sin confirmar duración clínica ni severidad. Puede haber cruces breves de referencia cerca de un límite. Los eventos se conservan con evidencia; no se confunde reconocer un mensaje con modificar un dato. Esta versión presenta los eventos como consulta, sin un flujo de reconocimiento ni registro de acciones médicas.

Con desconexión se guardan muestras nulas y la última válida se conserva. Al reconectar, la fuente recupera disponibilidad con una observación nueva. Una lectura inválida o de baja calidad no aporta valor actual, promedio ni condición nueva. El historial muestra la lectura y su calidad. Estos estados son independientes de la referencia ilustrativa del indicador.

## Persistencia y recuperación

La web y la CLI usan el mismo motor y el mismo repositorio de archivos, pero se pueden ejecutar por separado. La web no usa el motor para representar un resultado: lee el JSON ya verificado. No hay un índice de ejecuciones exclusivamente en memoria.

La identidad se calcula sobre el contenido completo del resultado, incluidas configuración y versiones. El contenedor incorpora una segunda huella SHA-256 y fecha real de guardado separada del tiempo de adquisición simulado. La publicación usa un temporal sincronizado y un enlace al nombre final sin reemplazo; los originales y ejecuciones existentes nunca se sobrescriben.

La atomicidad depende del soporte de enlaces del sistema de archivos. Se verificó sobre la carpeta de este equipo. Un volumen sin ese soporte produce un error visible; no se degrada a un guardado parcial silencioso. Para trasladar datos entre instalaciones basta copiar los JSON completos, con su nombre de ID, a la carpeta elegida. El listado valida cada archivo de nuevo.

## Evidencia científica y demostración

| Categoría | Estado |
| --- | --- |
| Contexto de peligros de vuelos espaciales | Referencia documentada en NASA HRP |
| Anatomía pulmonar general | Referencia documentada en OpenStax |
| NASA-STD-3001 | Documento de referencia para evaluación futura; sin análisis de conformidad de SIMISA |
| Fórmulas, amplitudes, períodos, escenarios y bandas | Decisiones sintéticas para probar software; sin validación clínica |
| Renders anatómicos | Generados con IA; procedencia conservada; revisión profesional pendiente |
| Protocolos P-114/P-207 y recomendaciones heredadas | Excluidos del producto por falta de documentos verificables y contradicciones internas |
| Índice integral de salud, fases de sueño y avisos de envío médico | Excluidos como resultados calculados; no hay evidencia de adquisición ni de implementación real |

Fuentes consultadas para delimitar el contexto, sin extrapolar validación al software:

- [NASA HRP · Five Hazards](https://www.nasa.gov/hrp/hazards/).
- [OpenStax · The Lungs](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-2-the-lungs).
- [NASA-STD-3001 Volume 1](https://www.nasa.gov/reference/nasa-std-3001v1/).

Estas fuentes no justifican tratamientos ni certifican la exactitud de las imágenes generadas. La aplicación conserva etiquetas de simulación en todas las secciones.
