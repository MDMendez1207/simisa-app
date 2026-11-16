# Implementation decisions

Original record: November 14, 2026. The user’s instruction gives SIMISA_entrega precedence for incompatible definitions and authorizes staged implementation with a standalone simulator.

[Español](../es/decisiones.md) · [Documentation](README.md)

## Source hierarchy

1. Current priorities: reproducible simulation, recoverable files and anatomy connected to results.
2. SIMISA_entrega: names, units, indicators and visual language.
3. SIMISA plan.md: functional guidance and traceability.
4. docs/simisa: background, scientific limits and recommendations. Claims about React applications and earlier tests are not evidence for files that are absent.

The new project is in `simisa-app`. No original source file is edited. `docs/fuentes-originales.json` retains checksums for all 79 originals.

## Navigation and presentation correction

Following a later user instruction, SIMISA_entrega’s 13 navigation entries were restored in the same order. The initial reduction to eight entries was an implementation shortcut, not an agreed product change.

Generation, parameters, saved results and playback controls appear only in Settings → Simulation. Synthetic-data notices, scientific scope and anatomy provenance are grouped under “About the data and assets” there. Measurement provenance remains in the files.

Consultation views use short source names, “Within/Outside reference” and acquisition dates. They do not repeat “demo” in cards, headers, regions, events or tables. Time windows in these views query history; speed and playback belong in Settings.

Restored sections query actual file contents: Sleep reads the rest sensor; Mental wellbeing lets astronauts enter mood and perceived stress and review check-in history; Assistant uses guided local queries; Research calculates statistics for the selected profile and period. Communications prepares reports and records delivery to a local inbox. Profiles initially offered local roles (`Astronaut`, `Medical team`, `Researcher`). Restoring the menu did not imply external connections or server authentication.

By explicit user instruction, vital signs and sleep come only from medical sensors and cannot be entered manually (`measurement` and `sleep` manual entries are rejected). Psychological wellbeing is entered manually through `wellbeing` check-ins, which supply `stress`.

## Crew and permissions (engine 2.0.0, schema 2)

At the user’s request, the website became a control center for four fictional crew members (`shared/crew.js`). Each run simulates all four; every measurement and event has `subjectId`. Schema 1 single-subject results remain readable.

- Commander and crew physician can view everyone; specialists can view only themselves. The server filters runs, downloads and activity for the session member.
- The session uses an `HttpOnly; SameSite=Strict` cookie containing the chosen member, without a password. This is demo identification, not authentication.
- Activity records both `subjectId` (about whom) and `authorId` (by whom). Mental check-ins and preferences apply only to oneself. The earlier local role selector was removed; Research became a crew view.
- Prepared episodes affect one member, Kenji Mori, so Crew health center shows who needs attention.

## Prior history (engine 2.1.0)

A run can include up to 30 days before its start (`historyDays`), using negative times so the run clock and scenarios remain intact. History is sampled every 30 minutes (`HISTORY_STEP_SEC`) to keep files manageable; reading freshness uses that spacing.

Historical mental check-ins are synthetic, stored in the immutable result (`checkins`, `synthetic: true`) separately from activity. Telemetry still contains no stress. Member-entered check-ins remain in activity. `synthetic-2.0.0` results remain readable.

## NASA HRP health guidance

The challenge requests guidance on treatment and health improvement. *5 Hazards of Human Spaceflight* and *Risks of Human Spaceflight* inform `shared/health-guide.js`: why each indicator matters, related hazards and risks, how it is measured and NASA’s general prevention measures (exercise, rest, nutrition and spacewalk procedures).

State-based guidance follows a demo scale: in range → self-care; no valid reading → check the device; outside reference → repeat measurement and notify the crew physician; outside continuously for more than 10 minutes or for two daily/periodic records → physician considers consulting ground flight physicians. This is not a clinical criterion; references remain illustrative. No treatment, medication or dosage is prescribed, and guidance includes that limitation.

## Resolved definitions

| Topic | Decision | Source and limit |
| --- | --- | --- |
| Glucose | `gluc`, mg/dL | SIMISA_entrega catalog; synthetic sensor; the separate engine’s `glucose` is not adopted |
| Pressure | `sys` and `dia`, mmHg | Both keys retained; same acquisition time and sensor; systolic above diastolic |
| Bone | `bmd`, bone density in g/cm² | Delivery meaning retained; periodic sensor measurement, not converted QUS |
| Stress | `stress`, 0–10 | `/10` retained; manual mental check-in self-report, not sensor simulation |
| Sleep | `sleep`, hours | Daily synthetic rest sensor; no manual entry or invented phases/efficiency |
| Temperature | `temp`, °C | Synthetic delivery quantity; no claimed equivalence between skin and core measurement |
| Thresholds | Delivery `lo` and `hi` | Illustrative references without established individual clinical support |
| Person | Ana Torres, fictional | Delivery profile; the separate engine’s different crew was not imported |
| Regions | Body, chest, lungs, abdomen, bones, head | Delivery associations for navigation, without inferring where an abnormality is located |

Visible precision is one decimal for vital signs and scales, integers for pressure and two decimals for bone density. This avoids hiding bmd changes by rounding to one decimal.

## Concrete reuse

- SIMISA_entrega’s variables and structure, component, KPI and table styles were copied unchanged. `web/css/app.css` extends readability, mobile layout and motion preferences.
- Its SVG brand, sidebar, icon family and text utilities were reused. Navigation exposes sections backed by files.
- `shared/indicadores-original.js` is a copy of the original catalog. The operating catalog creates frozen records from it; per-screen baseline mutation and curve generation are not used.
- Chart drawing evolved to SVG with acquisition times, excluded observations and gaps. Pressure, pulse and oxygen do not share an axis.
- Mulberry32 was reused, but each observation has its own derived seed, avoiding dependence on generator state that `reset()` did not restore.
- The absent `data/rules.json` was not invented. Bands come from the delivery version. The new engine does not claim to preserve hysteresis or protocols from a missing system.
- Seven original PNGs, including the historic overview, and provenance/prompts were copied. The app uses the updated body and five details, with controls and labels separate from image pixels.

## Simulation consistency

One clock advances in configurable steps. A prepared activity variable affects pulse, respiration and pressure; the respiratory episode affects SpO₂, pulse and respiratory rate together. These are test relationships chosen to support a scenario, without calibration against subject data.

Test sampling periods are 10 s for pulse/respiration/oxygenation, 60 s for temperature, 300 s for pressure and glucose, one day for sleep and 28 days for bone density. Every run starts with a synthetic baseline observation for each sensor indicator (`synthetic-1.1.0` / `entrega-1.1.0`). Perceived stress is supplied by astronaut check-ins (`captureMethod: 'self_report'`), not the engine. Older `1.0.0` files remain readable without rewriting; their synthetic stress is not presented as sensor data. Larger steps reduce effective sampling frequency; files retain actual acquisition times.

Conditions are evaluated directly against delivery bands without confirming clinical duration or severity. Brief reference crossings can occur near a limit. Events retain evidence; acknowledging a message does not modify a reading. Marking **Reviewed** writes `acknowledge` activity without changing the simulation file. The original implementation had no medical action record or reviewer identity beyond the selected local profile; later crew activity adds author/subject identities as described above.

Disconnections save null samples while keeping the last valid value. Reconnection restores availability with a new observation. Invalid or low-quality readings do not provide current values, averages or a new condition. History shows the reading and quality. These states are independent of the indicator’s illustrative reference.

## Persistence and recovery

Website and CLI share the engine and file repository but run separately. The website reads verified JSON to display a result rather than regenerating it. The run index is not held only in memory.

Identity is calculated from the complete result, including settings and versions. The envelope adds another SHA-256 checksum and an actual save date separate from simulated acquisition time. Publication uses a synchronized temporary file and a link to the final name without replacement; originals and existing runs are never overwritten.

Atomicity depends on filesystem link support and was verified on this machine’s folder. A volume without that support returns a visible error rather than silently saving partially. To move data between installations, copy complete JSON files with their ID filenames to the chosen folder. Listing validates every file again.

## Scientific evidence and demonstration

| Category | Status |
| --- | --- |
| Spaceflight hazard context | Documented NASA HRP reference |
| General lung anatomy | Documented OpenStax reference |
| NASA-STD-3001 | Future evaluation reference; no SIMISA conformity assessment |
| Formulas, amplitudes, periods, scenarios and bands | Synthetic software-testing decisions; no clinical validation |
| Anatomy renders | AI-generated, provenance retained, professional review pending |
| Inherited P-114/P-207 protocols and recommendations | Excluded for lack of verifiable documents and internal contradictions |
| Integrated health score, sleep phases and medical dispatch notices | Excluded as calculated results; no evidence of acquisition or real implementation |

Sources consulted to define context, without extending validation to the software:

- [NASA HRP · Five Hazards](https://www.nasa.gov/hrp/hazards/).
- [OpenStax · The Lungs](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-2-the-lungs).
- [NASA-STD-3001 Volume 1](https://www.nasa.gov/reference/nasa-std-3001v1/).

These sources do not justify treatments or certify generated image accuracy. The original record’s final statement about simulation labels in every section is superseded by its navigation correction above: detailed scope notices are grouped in Settings and retained in exports.

## English and Spanish presentation

The website starts in English and remembers an explicit Spanish selection. `web/js/i18n.js` translates authored template text before inserting dynamic content, preserving form values, identifiers and user prose. Catalog and health-guide labels are translated only at presentation boundaries; saved files and simulation identities remain unchanged. English messages are in `web/js/locales/`. The button has a fixed width, navigation and status labels can wrap, and mobile header controls have room for both languages.
