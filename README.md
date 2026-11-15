# SIMISA · Simulación y anatomía

Proyecto nuevo construido a partir de `SIMISA_modular/SIMISA_entrega`. Los originales del directorio padre se conservan. Requiere Node.js 22 o posterior; no necesita descargar dependencias.

## Abrir la aplicación

En Windows, ejecutar **Iniciar SIMISA.cmd** y abrir [SIMISA local](http://127.0.0.1:4180). Mantener abierta la ventana de la aplicación.

También se puede iniciar desde esta carpeta:

```powershell
node server.js
```

El servicio escucha exclusivamente en `127.0.0.1`. El puerto por defecto es 4180. Se puede cambiar mediante la variable `PORT`.

## Primer recorrido completo

1. Abrir **Configuración → Simulación**. Elegir nombre, escenario, semilla, duración, paso e inicio UTC.
2. Pulsar **Ejecutar y guardar**. La aplicación calcula, escribe el archivo, verifica su integridad y vuelve a leerlo antes de mostrarlo.
3. Explorar **Salud corporal**. Seleccionar corazón, pulmones u otra región; usar el control temporal, zoom, arrastre o teclado.
4. Cerrar la aplicación local y el navegador. Volver a iniciar `Iniciar SIMISA.cmd`.
5. Elegir la ejecución guardada y explorarla otra vez. La recuperación no ejecuta el motor ni genera curvas nuevas.

La exploración comienza pausada al inicio de la ejecución. Los controles de reproducción y **Ir al primer evento** están solamente en **Configuración → Simulación**. Las vistas de consulta conservan un selector de momento para recorrer el historial. La reproducción avanza sobre registros ya guardados y se pausa al ocultar la ventana. Elegir un nuevo resultado reinicia solamente su exploración, sin borrar archivos.

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
- El navegador guarda solamente la selección de archivo y la preferencia de movimiento, no las mediciones. La preferencia no es necesaria para recuperar resultados.

Un cierre abrupto antes de publicar puede dejar un temporal ignorado por el listado. No se garantiza conservación frente a fallas físicas del dispositivo de almacenamiento. Conservar copias de los JSON si se necesitan respaldos externos.

## Definiciones y límites

SIMISA_entrega decide claves, nombres, unidades y bandas de referencia. Se conservan `hr`, `sys`, `dia`, `rr`, `spo2`, `temp`, `gluc`, `bmd`, `sleep` y `stress`. La densidad ósea permanece en g/cm²; estrés usa escala 0–10; la presión conserva dos indicadores adquiridos juntos. [Decisiones y trazabilidad](docs/decisiones.md).

Los signos vitales y el sueño provienen exclusivamente de sensores médicos simulados; la aplicación no permite ingresar ni sobreescribir esas mediciones a mano. El único registro manual habilitado es el **chequeo psicológico** en **Bienestar psicológico**, donde el astronauta registra su estado de ánimo y estrés percibido (0–10) como autoinforme.

Son datos sintéticos para probar software. Las referencias numéricas, relaciones, períodos y eventos son demostrativos, sin validación fisiológica o clínica. Las imágenes son ilustraciones 2D generadas con IA, con detalles independientes y zoom limitado a su resolución. No permiten rotación 3D ni diagnóstico. Se conserva la [procedencia anatómica](web/assets/PROCEDENCIA.md) y sus prompts.

La navegación conserva las 13 opciones originales de SIMISA_entrega. Sueño consulta las lecturas del sensor de descanso; Bienestar psicológico permite completar y consultar el chequeo psicológico junto al descanso; el asistente ofrece respuestas locales guiadas sobre las lecturas y chequeos seleccionados; Investigación calcula y exporta estadísticas. Comunicación Tierra permite preparar, entregar en bandeja local y descargar informes; Perfiles permite alternar el perfil local (`Astronauta`, `Equipo médico`, `Investigador`). No se inventan fases de sueño, conexiones externas ni autenticación de servidor.

Los parámetros, la selección de resultados, los controles de reproducción, la procedencia y los límites de los datos se concentran en **Configuración → Simulación**. Las demás vistas presentan las lecturas sin carteles de demo, identificadores de archivo ni aclaraciones repetidas. La clasificación y procedencia sintética siguen conservadas en los archivos y exportaciones.

No hay sensores reales, autenticación, permisos médicos ni sincronización con Tierra. No se deben introducir datos personales reales.

## Verificación

```powershell
node --test
node scripts/verify-originals.js
```

Las pruebas comprueban reproducción exacta, restricciones y frecuencias, presión pareada, episodios, ausencias, recuperación, calidad, corrupción de archivos, guardado idempotente, API y reinicio real del proceso después de generar una ejecución con la CLI. El segundo comando coteja los 79 archivos originales con las huellas tomadas antes de crear el proyecto.

La revisión del navegador y sus límites se registran en [Validación](docs/validacion.md).

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
| `test/` | Pruebas funcionales |
| `docs/` | Decisiones, evidencia y manifiesto de originales |
