# Procedencia de las ilustraciones anatómicas

Fecha: 14 de noviembre de 2026.

## Conjunto actual

Generado con la herramienta de imágenes integrada de Codex. Las imágenes finales se copiaron al proyecto sin retocar sus píxeles ni aumentar artificialmente su resolución. Se conserva el original `cuerpo-holografico.png`.

| Archivo | Tamaño original | Vista |
| --- | --- | --- |
| cuerpo-holografico-v2.png | 1024 × 1536 | Cuerpo completo anterior |
| corazon-oblicuo.png | 1254 × 1254 | Detalle anterior del corazón en contexto torácico |
| pulmones-oblicuos.png | 1254 × 1254 | Perspectiva oblicua del tórax |
| abdomen-oblicuo.png | 1254 × 1254 | Detalle anterior abdominal |
| cabeza-lateral.png | 1254 × 1254 | Perfil izquierdo de cabeza |
| piernas-oblicuas.png | 1024 × 1536 | Perspectiva oblicua de pelvis y piernas |

El archivo original se empleó como referencia estética para la nueva vista general. Esa vista general se usó a su vez como referencia de identidad y materiales para los cinco detalles. Se realizaron correcciones adicionales del número de ramas del arco aórtico en el detalle cardíaco y de las cisuras pulmonares en el detalle respiratorio. Las variantes descartadas permanecen fuera del proyecto.

El prompt completo de cada generación y de las dos correcciones se conserva en [PROMPTS.json](../../web/assets/PROMPTS.json).

## Referencias anatómicas consultadas

- [OpenStax: The Lungs](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-2-the-lungs): lóbulos, cisuras, escotadura cardíaca y relación con diafragma.
- [Cambridge University Press: Essential Radiological Anatomy for the MRCS, extracto](https://assets.cambridge.org/97805217/28089/excerpt/9780521728089_excerpt.pdf): posición del corazón en mediastino, orientación del ápex y superficies.
- [OpenStax: Digestive Systems](https://openstax.org/books/biology/pages/34-1-digestive-systems): disposición general de órganos digestivos y trayecto del colon.
- [OpenStax: Accessory Organs in Digestion](https://openstax.org/books/anatomy-and-physiology/pages/23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder): hígado, páncreas y vesícula.

Estas fuentes orientaron las restricciones de los prompts. Sus ilustraciones no se descargaron ni se incorporaron al proyecto. La consulta de referencias y la inspección visual no equivalen a una validación anatómica profesional.

## Integración

- La aplicación React utiliza vistas preparadas para los módulos existentes: corazón, pulmones, abdomen y huesos/piernas. No se añadió un módulo de salud cerebral sin métricas asociadas.
- El prototipo corporal también utiliza el perfil de cabeza.
- La selección de región abre su render de detalle. El selector permite alternar con la ubicación en el cuerpo frontal.
- El zoom es relativo a cada render. Se conservan desplazamiento, teclado, restablecimiento y preferencia de movimiento reducido.
- Los fondos oscuros se integran con mezcla de pantalla en ambos exploradores. Los detalles son RGB con fondo negro; no se presentan como recortes con transparencia real.
- La galería `../renders.html` permite revisar y descargar los seis PNG originales.

## Límites

Ilustraciones conceptuales generadas con IA, sin validación médica. Pueden contener simplificaciones, errores locales y diferencias entre encuadres, particularmente en vasos pequeños y continuidad tridimensional. No son vistas calculadas de una malla 3D común: son imágenes independientes guiadas por la misma referencia. No permiten rotación libre ni diagnóstico. Se requiere revisión profesional antes de utilizarlas como material anatómico educativo o clínico.

## Recurso anterior

`cuerpo-holografico.png` se conserva como referencia histórica. Su prompt original: cuerpo completo frontal con tejido azul translúcido, esqueleto cian, pulmones translúcidos, corazón coral en hemitórax izquierdo y órganos digestivos, sin interfaz ni etiquetas. La primera versión se documentó como conceptual y no validada; sus proporciones cardíacas motivaron esta revisión.
