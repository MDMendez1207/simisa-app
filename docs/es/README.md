# SIMISA · Simulación y anatomía

Prototipo para el desafío *Create Health Monitoring Software for Astronauts on Space Missions* de NASA Space Apps 2026 ([enunciado y cobertura](challenge.md)). Requiere Node.js 22 o posterior; no necesita descargar dependencias.

## Herramientas de construcción y uso de IA

La aplicación se construyó con **JavaScript (módulos ES), HTML, CSS y SVG**, sobre **Node.js 22 o posterior**, usando sus módulos nativos para el servidor, los archivos, la integridad de los datos y las pruebas. El trabajo se realizó en Windows con PowerShell, Git/GitHub y revisión en navegador. El repositorio incluye la preparación de la web de muestra para Vercel y una opción de túnel con Cloudflare.

Se utilizó **Codex de OpenAI** como asistencia para analizar los materiales, implementar y revisar código, preparar pruebas y redactar documentación. Las ilustraciones anatómicas se generaron con la **herramienta de imágenes integrada de Codex**, conservando sus prompts y procedencia. El entorno de trabajo también conserva una configuración auxiliar de **OpenCode**; los modelos utilizados con esa herramienta no quedaron identificados en los materiales disponibles.

El [detalle de herramientas y declaración de uso de IA](herramientas-e-ia.md) registra el propósito y la evidencia de cada recurso. El asistente de la app responde mediante consultas locales programadas sobre los resultados de la simulación.

## Idioma y documentación

La web abre en inglés. El botón **ES / EN**, disponible en el ingreso y en la cabecera, permite cambiar de idioma y recuerda la preferencia. Las mediciones y los textos ingresados se conservan.

Documentos en español: [Desafío](challenge.md), [Decisiones](decisiones.md), [Validación](validacion.md), [Herramientas e IA](herramientas-e-ia.md), [Procedencia de las ilustraciones](procedencia-ilustraciones.md). [English documentation](../en/README.md).

## Abrir la aplicación

En Windows, ejecutar **Iniciar SIMISA.cmd** y abrir [SIMISA local](http://127.0.0.1:4180). Mantener abierta la ventana de la aplicación.

También se puede iniciar desde esta carpeta:

```powershell
node server.js
```

El servicio escucha exclusivamente en `127.0.0.1`. El puerto por defecto es 4180. Se puede cambiar mediante la variable `PORT`.


## Tripulación y permisos

SIMISA funciona como centro de control de una tripulación ficticia de cuatro personas. Al abrir la web se elige quién ingresa (identificación de demostración, sin contraseña); el servidor aplica los permisos según ese tripulante mediante una cookie de sesión.

| Tripulante | Rol | Acceso |
| --- | --- | --- |
| Ana Torres (CDR) | Comandante | Toda la tripulación: Centro de tripulación, alertas, investigación y simulación |
| Lucía Ferreyra (CMO) | Médica de tripulación | Igual que comandante |
| Kenji Mori (MS1) | Especialista de misión | Solo su propia información |
| Omar Haddad (MS2) | Especialista de misión | Solo su propia información |

- Sin acceso de tripulación, la API entrega solo la vista propia de la ejecución y de la actividad; las demás vistas devuelven 403.
- Cada tripulante completa únicamente su propio chequeo psicológico (ánimo y estrés percibido). Comandante y médica pueden consultarlo, no completarlo por otro.
- Los episodios preparados de los escenarios (SpO₂, desconexión, señal inválida) afectan a Kenji Mori; el resto de la tripulación varía dentro de referencia.

## Estado de sensores

Cada tripulante usa nueve dispositivos (`shared/devices.js`): los ocho de SIMISA_entrega (ECG · Parche torácico, Oxímetro de pulso, Banda respiratoria, Sensor térmico dérmico, Tensiómetro biométrico, Biosensor metabólico, Actígrafo de sueño y Densitómetro óseo portátil) más un **Dosímetro personal**. La página muestra un resumen (conectados, con advertencias, sin señal), un recuadro de **posibles problemas** y el inventario con estado, último dato válido, calidad de señal y batería.

- Estado y calidad se calculan con las lecturas guardadas: desconexión, datos inválidos, señal débil o desactualizada. La calidad es el porcentaje de lecturas válidas entre las últimas 12.
- La batería es una **estimación simulada** (descarga lineal y recarga diaria), no telemetría del archivo. Por debajo de 20 % se informa como problema; en el escenario, el oxímetro de Kenji llega con poca batería al episodio.
- El Centro de tripulación también avisa de las baterías bajas.

El dosímetro incorpora `rad`, **Tasa de dosis de radiación**, en **µSv/h**, una vez por minuto (cada 30 minutos en el historial previo). Se consulta en Panel general, Salud corporal → Abdomen (categoría de navegación, sin atribuir exposición a un órgano), Gráficas e historial, Información médica, Asistente e Investigación, con exportación e informes. El motor independiente también la guarda. Las gráficas largas aplican la misma agrupación por media y rango que al resto de las series continuas, sin modificar las lecturas archivadas.

Desde `synthetic-2.3.0` / `entrega-1.3.0`, las nuevas ejecuciones usan el perfil **ISS/LEO**: **0,4–1,1 mSv/día** como escala de exposición, equivalente a tasas medias de **16,67–45,83 µSv/h**. El rango procede del [informe NASA de 2002, sección 2.3](https://ntrs.nasa.gov/api/citations/20020073167/downloads/20020073167.pdf), referido a dosis equivalente a órganos hematopoyéticos y variaciones de blindaje/ciclo solar. [NASA, 2023](https://www.nasa.gov/wp-content/uploads/2023/10/lsah-newsletter-2023-vol28-issue2.pdf) cita un orden de 0,5 mSv/día en ISS. Esta escala no equivale a calibrar un dosímetro ni a predecir dosis efectiva individual o exposición lunar.

El generador usa un punto medio de 31,25 µSv/h y variaciones acotadas de 7 días y 90 minutos, compartidas por la tripulación, con pequeñas diferencias por persona y ruido reproducible. Las ondas, frecuencias y pesos son **sintéticos**, independientes del esfuerzo o episodio respiratorio. El perfil, su alcance y sus fuentes quedan guardados en `radiationModel` dentro de cada resultado. El rango de exposición no se usa como banda de seguridad.

La [OMS](https://www.who.int/news-room/fact-sheets/detail/ionizing-radiation-and-health-effects) cita evidencia de aumento del riesgo de cáncer por encima de **100 mSv de dosis**; no establece un umbral anual universal ni ausencia de riesgo por debajo. SIMISA no calcula riesgo individual ni dispara alertas médicas a partir de esa cifra. La métrica sigue siendo una **tasa**, no dosis acumulada ni daño por órgano; una lectura válida aparece como «Lectura disponible». El contexto y las fuentes se consultan en Información médica. Los archivos anteriores conservan sus valores y dispositivos: no se reescriben ni reciben lecturas inventadas.

## Historial previo

`historyDays` (0–30; formulario **Historial previo (días)** o `--history` en la CLI) genera días anteriores al inicio de la ejecución, con tiempos negativos:

- Signos vitales cada 30 minutos con ritmo día/noche, sueño diario y densitometría ósea según su período (28 días).
- Un chequeo psicológico sintético por día y tripulante, guardado en el archivo (`checkins`) y marcado como **Historial sintético**; no se confunde con los chequeos registrados.
- En Kenji Mori, el descanso empeora y el estrés percibido aumenta en los últimos días, como antesala del episodio.
- Las gráficas permiten elegir el período (Todo, 14 días, 3 días, 24 h, 1 h) y marcan el inicio de la ejecución. **Inicio del historial** en Configuración → Simulación lleva al primer día.

Los ejemplos incluidos tienen 14 días de historial (unos 10 MB por archivo).

## Simulador independiente

No hace falta iniciar el servicio web ni abrir un navegador:

```powershell
node cli.js --config examples/recorrido.json
```

O configurar una ejecución directamente:

```powershell
node cli.js --name "Prueba respiratoria" --scenario respiratorio --seed 42 --duration 60 --step 10
```

`node cli.js --help` muestra los parámetros. `--out` permite elegir otra carpeta de resultados. La web detecta las ejecuciones que se escriban en su carpeta de datos; pulsar **Actualizar archivos** en **Configuración → Simulación** si estaba abierta.

La función `simulate(config)` de `engine/simulator.js` también se puede importar desde otro programa Node.js. No contiene código del navegador ni escribe archivos; `storage/files.js` resuelve el guardado.

## Archivos y reproducibilidad

- Ubicación predeterminada: `data/runs/<id>.json`, dentro de este proyecto. La variable `SIMISA_DATA_DIR` cambia la carpeta leída por el servicio.
- Cada archivo contiene configuración, identidad ficticia, versiones de esquema/motor/catálogo, definiciones de indicadores, fuentes, observaciones individuales, eventos, supuestos y huella SHA-256.
- El guardado escribe y sincroniza un archivo temporal, lo publica sin sobrescribir archivos existentes y verifica su lectura. Un error de escritura o verificación impide confirmar éxito.
- La misma configuración y versiones producen el mismo contenido e identificador. Una ejecución idéntica recupera el archivo ya existente. El nombre también integra la identidad de la ejecución.
- Cada observación tiene ruido determinado por semilla, indicador y tiempo simulado. Consultar otras pantallas o ejecutar otro escenario no consume ni modifica su secuencia.
- Las observaciones son inmutables. Las ausencias se guardan como `null`; baja calidad e invalidez quedan identificadas y excluidas de los valores actuales y los resúmenes.
- El listado lee el directorio real; no depende de un índice en memoria. Un archivo dañado aparece como advertencia y no se modifica. Las versiones desconocidas se rechazan; una futura versión deberá ofrecer migración explícita.
- El navegador guarda solamente la selección de archivo y las preferencias de movimiento e idioma, no las mediciones. La preferencia no es necesaria para recuperar resultados.

Un cierre abrupto antes de publicar puede dejar un temporal ignorado por el listado. No se garantiza conservación frente a fallas físicas del dispositivo de almacenamiento. Conservar copias de los JSON si se necesitan respaldos externos.


## Verificación

```powershell
node --test
node scripts/verify-originals.js
```

Las pruebas (18, en `test/`, incluidas permisos de tripulación e historial previo) comprueban reproducción exacta, restricciones y frecuencias, presión pareada, episodios, ausencias, recuperación, calidad, corrupción de archivos, guardado idempotente, API, reinicio real del proceso después de generar una ejecución con la CLI, actividad registrada (chequeo psicológico, revisiones, informes, envío único ante solicitudes simultáneas, tolerancia a archivos dañados), acceso por túnel y consultas del asistente e investigación. El segundo comando coteja los 79 archivos originales con las huellas tomadas antes de crear el proyecto; solo funciona dentro de la carpeta SIMISA original, porque esos archivos están fuera de este repositorio.

Durante el desarrollo no se ejecuta la batería completa tras cada cambio: se usa `node --check <archivo>` y solo el archivo de prueba afectado (`test/simulation.test.js`, `test/activity.test.js` o `test/consultation.test.js`). La batería completa se reserva para cerrar una fase o antes de un commit. Detalle en la skill `simisa-modo-rapido` (`../../../.opencode/skills/simisa-modo-rapido/SKILL.md`).

La revisión del navegador y sus límites se registran en [Validación](validacion.md).

## Organización

| Carpeta o archivo | Responsabilidad |
| --- | --- |
| `engine/` | Motor sintético independiente |
| `shared/` | Catálogo y consultas comunes sobre resultados |
| `storage/` | Esquema, integridad y persistencia real |
| `cli.js` | Ejecución sin web |
| `server.js` | Servicio local y lectura de archivos para la interfaz |
| `web/` | Interfaz derivada de SIMISA_entrega y assets conservados |
| `data/runs/` | Ejecuciones persistidas |
| `data/legacy-*/` | Ejemplos de versiones anteriores del motor, archivados sin cambios |
| `shared/crew.js` | Tripulación ficticia, roles y reglas de acceso |
| `Publicar SIMISA.cmd` | Servidor + túnel de Cloudflare para un enlace público |
| `test/` | Pruebas funcionales |
| `docs/` | Decisiones, evidencia y manifiesto de originales |
