# Anatomy illustration provenance

Date: November 14, 2026.

[Español](../es/procedencia-ilustraciones.md) · [Documentation](README.md)

## Current set

Generated with Codex’s integrated image tool. Final images were copied into the project without pixel retouching or artificial upscaling. The original `cuerpo-holografico.png` is retained.

| File | Original size | View |
| --- | --- | --- |
| cuerpo-holografico-v2.png | 1024 × 1536 | Full body, anterior |
| corazon-oblicuo.png | 1254 × 1254 | Anterior heart detail in the thoracic context |
| pulmones-oblicuos.png | 1254 × 1254 | Oblique thoracic view |
| abdomen-oblicuo.png | 1254 × 1254 | Anterior abdominal detail |
| cabeza-lateral.png | 1254 × 1254 | Left head profile |
| piernas-oblicuas.png | 1024 × 1536 | Oblique pelvis and legs |

The original file served as an aesthetic reference for the new overview. That overview then provided the identity and material reference for the five details. Additional corrections addressed aortic arch branch count in the heart detail and pulmonary fissures in the respiratory detail. Rejected variants remain outside the project.

Full prompts for each generation and both corrections are retained in [PROMPTS.json](../../web/assets/PROMPTS.json).

## Anatomy references consulted

- [OpenStax: The Lungs](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-2-the-lungs): lobes, fissures, cardiac notch and relationship to the diaphragm.
- [Cambridge University Press: Essential Radiological Anatomy for the MRCS, excerpt](https://assets.cambridge.org/97805217/28089/excerpt/9780521728089_excerpt.pdf): heart position in the mediastinum, apex orientation and surfaces.
- [OpenStax: Digestive Systems](https://openstax.org/books/biology/pages/34-1-digestive-systems): general digestive organ layout and colon path.
- [OpenStax: Accessory Organs in Digestion](https://openstax.org/books/anatomy-and-physiology/pages/23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder): liver, pancreas and gallbladder.

These sources informed prompt constraints. Their illustrations were neither downloaded nor included. Consulting references and inspecting images does not constitute professional anatomical validation.

## Integration

The following points translate the original asset record, including its references to earlier React and body prototypes:

- The React application uses views prepared for the existing heart, lung, abdomen and bone/leg modules. No brain-health module was added without associated metrics.
- The body prototype also uses the head profile.
- Region selection opens the corresponding detail render. The selector can switch to its location on the frontal body.
- Zoom is relative to each render. Pan, keyboard control, reset and reduced motion remain available.
- Dark backgrounds use screen blending in both explorers. Details are RGB with black backgrounds, not truly transparent cutouts.
- The original `../renders.html` gallery was documented as a way to review and download the six original PNGs; it is a reference to the original material, not an active app route.

## Limits

Conceptual AI-generated illustrations without medical validation. They may contain simplifications, local errors and differences between views, particularly in small vessels and three-dimensional continuity. They are independent images guided by a shared reference, not views calculated from one 3D mesh. They do not support free rotation or diagnosis. Professional review is required before educational or clinical anatomy use.

## Earlier asset

`cuerpo-holografico.png` remains as a historical reference. Its original prompt described a full frontal body with translucent blue tissue, cyan skeleton, translucent lungs, a coral heart in the left hemithorax and digestive organs, without UI or labels. The first version was documented as conceptual and unvalidated; its heart proportions prompted this revision.
