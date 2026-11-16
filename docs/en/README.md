# SIMISA · Simulation and anatomy

Prototype for NASA Space Apps 2026’s *Create Health Monitoring Software for Astronauts on Space Missions* ([challenge and coverage](challenge.md)). Requires Node.js 22 or later, with no dependencies to download.

[Español](../es/README.md) · [Decisions](decisions.md) · [Validation](validation.md) · [Tools and AI](tools-and-ai.md) · [Illustration provenance](illustration-provenance.md)

## Language

The website opens in **English** on the first visit. The **ES / EN** button on the sign-in screen and application header switches languages and remembers the preference. The current view, mission time and form drafts are retained. User notes, crew names, saved measurements and identifiers keep their original content.

The interface uses concise translations and flexible controls to accommodate both languages. Documentation is organized in `docs/en/` and `docs/es/`; both sections are also linked from Settings → Preferences. Existing documentation paths provide links to the language sections.

## Build tools and AI use

The app was built with **JavaScript (ES modules), HTML, CSS and SVG**, on **Node.js 22 or later**, using native modules for the server, files, data integrity and tests. Development used Windows, PowerShell, Git/GitHub and browser review. The repository includes a Vercel showcase build and a Cloudflare tunnel option.

**OpenAI Codex** assisted with material analysis, implementation, code review, checks and documentation. Anatomy illustrations were generated with **Codex’s integrated image tool**, retaining prompts and provenance. An auxiliary **OpenCode** configuration is also present in the workspace; the available material does not identify which models were used with it.

The [tools inventory and AI disclosure](tools-and-ai.md) records the purpose and evidence for each resource. The in-app assistant uses programmed local queries over simulation results.

## Open the app

On Windows, run **Iniciar SIMISA.cmd** and open [local SIMISA](http://127.0.0.1:4180). Keep the application window open.

Alternatively, start it from the project folder:

```powershell
node server.js
```

The service listens only on `127.0.0.1`. The default port is 4180; set `PORT` to change it.

## Crew and permissions

SIMISA is a control center for four fictional crew members. On opening the website, select a crew profile (demo identification without a password). The server applies that member’s permissions using a session cookie.

| Crew member | Role | Access |
| --- | --- | --- |
| Ana Torres (CDR) | Commander | Entire crew: Crew health center, alerts, research and simulation |
| Lucía Ferreyra (CMO) | Crew physician | Same as commander |
| Kenji Mori (MS1) | Mission specialist | Own information only |
| Omar Haddad (MS2) | Mission specialist | Own information only |

- Without crew access, the API exposes only the member’s own run and activity view; restricted views return 403.
- Each member completes only their own mental check-in (mood and perceived stress). Commander and physician may review it, not complete it for someone else.
- Prepared scenario episodes (SpO₂, disconnection, invalid signal) affect Kenji Mori; the rest of the crew stays within reference variation.

## Sensor status

Each member uses nine devices (`shared/devices.js`): the eight from SIMISA_entrega (ECG chest patch, pulse oximeter, respiratory belt, skin temperature sensor, biometric blood pressure monitor, metabolic biosensor, sleep actigraph and portable bone densitometer) plus a **personal dosimeter**. The page shows a summary (connected, warnings, no signal), **potential issues** and an inventory with status, last valid reading, signal quality and battery.

- Status and quality come from saved readings: disconnected, invalid, weak or outdated data. Quality is the percentage of valid readings among the last 12.
- Battery is a **simulated estimate** (linear discharge and daily charging), not telemetry in the file. Below 20% it is flagged as an issue; Kenji’s oximeter reaches the scenario episode with a low battery.
- Crew health center also flags low batteries.

The dosimeter adds `rad`, **Radiation dose rate**, in **µSv/h**, once per minute (every 30 minutes in prior history). It is available in Health overview, Body health → Abdomen (a navigation category, without attributing exposure to an organ), Charts and history, Medical information, Assistant and Research, with exports and reports. The standalone engine also saves it. Long charts use the same mean-and-range grouping as other continuous series without altering archived readings.

Since `synthetic-2.3.0` / `entrega-1.3.0`, new runs use the **ISS/LEO** exposure scale: **0.4–1.1 mSv/day**, equivalent to mean rates of **16.67–45.83 µSv/h**. This comes from [NASA’s 2002 report, section 2.3](https://ntrs.nasa.gov/api/citations/20020073167/downloads/20020073167.pdf), referring to equivalent dose to blood-forming organs and shielding/solar-cycle variation. [NASA, 2023](https://www.nasa.gov/wp-content/uploads/2023/10/lsah-newsletter-2023-vol28-issue2.pdf) cites about 0.5 mSv/day on the ISS. This scale does not calibrate a dosimeter or predict individual effective dose or lunar exposure.

The generator uses a midpoint of 31.25 µSv/h and bounded 7-day and 90-minute variations shared by the crew, with small individual differences and reproducible noise. Waves, frequencies and weights are **synthetic**, independent of exertion or respiratory episodes. The profile, scope and sources are saved in each result’s `radiationModel`. The exposure range is not used as a safety band.

[WHO](https://www.who.int/news-room/fact-sheets/detail/ionizing-radiation-and-health-effects) cites evidence of increased cancer risk above **100 mSv of dose**; it sets no universal annual threshold and does not claim no risk below it. SIMISA does not calculate individual risk or trigger medical alerts from that figure. The metric remains a **rate**, not cumulative dose or organ damage; a valid reading is labeled “Reading available”. Context and sources are in Medical information. Older files retain their values and devices; they are neither rewritten nor given invented readings.

## Prior history

`historyDays` (0–30, **Prior history (days)** in the form or `--history` in the CLI) generates days before the run starts, using negative times:

- Vital signs every 30 minutes with day/night variation, daily sleep and bone densitometry at its own interval (28 days).
- One synthetic mental check-in per day and member, saved in `checkins` and labeled **Synthetic history**, distinct from recorded check-ins.
- Kenji’s rest worsens and perceived stress rises over the final days before the episode.
- Chart windows: All, 14 days, 3 days, 24 h and 1 h, with a simulation start marker. **History start** in Settings → Simulation moves to the first day.

Included examples have 14 days of history (about 10 MB per file).

## Standalone simulator

No web service or browser is needed:

```powershell
node cli.js --config examples/recorrido.json
```

Or configure a run directly:

```powershell
node cli.js --name "Respiratory test" --scenario respiratorio --seed 42 --duration 60 --step 10
```

`node cli.js --help` lists parameters. `--out` selects another output folder. The website detects runs written to its data folder; use **Refresh files** in **Settings → Simulation** if it is already open. Scenario identifiers remain stable across languages.

`simulate(config)` from `engine/simulator.js` can also be imported into another Node.js program. It contains no browser code and writes no files; `storage/files.js` handles persistence.

## Files and reproducibility

- Default location: `data/runs/<id>.json` in this project. `SIMISA_DATA_DIR` changes the service’s data folder.
- Each file contains configuration, fictional identity, schema/engine/catalog versions, indicator definitions, sources, individual observations, events, assumptions and a SHA-256 checksum.
- Saving writes and synchronizes a temporary file, publishes it without replacing existing files and verifies it by reading it back. A write or verification error prevents a success response.
- Identical settings and versions produce identical content and identifiers. An identical run retrieves the existing file. The run name also contributes to its identity.
- Each observation’s noise is determined by seed, indicator and simulated time. Viewing another screen or running another scenario does not consume or change its sequence.
- Observations are immutable. Missing readings are `null`; low-quality and invalid values are identified and excluded from current values and summaries.
- The list reads the actual directory, not an in-memory index. Damaged files appear as warnings and remain untouched. Unknown versions are rejected; future versions must provide explicit migration.
- The browser stores only the selected file and motion/language preferences, not measurements. Preferences are not required to recover results.

An abrupt shutdown before publication may leave a temporary file ignored by the listing. Preservation against physical storage failure is not guaranteed. Keep copies of the JSON files for external backups.

## Verification

```powershell
node --test
node scripts/verify-originals.js
```

Tests in `test/` cover exact reproduction, constraints and sampling rates, paired pressure, episodes, missing data, recovery, quality, corruption, idempotent saving, API behavior, a real process restart after CLI generation, activity (mental check-ins, reviews, reports, single dispatch under concurrent requests, damaged-file tolerance), crew permissions, prior history, tunnel access, assistant queries and research. The consultation checks also cover English responses, Spanish switching and localized CSV headings.

The second command compares 79 original files with checksums recorded before creating this project. It works only inside the original SIMISA workspace because those files are outside this repository.

During development, do not run the full suite after every edit: use `node --check <file>` and the affected test file (`test/simulation.test.js`, `test/activity.test.js` or `test/consultation.test.js`) at the end of a work block. Reserve the full suite for a phase boundary or before a commit. See the workspace’s `simisa-modo-rapido` policy (`../.opencode/skills/simisa-modo-rapido/SKILL.md` relative to the project root).

The dated browser review and its limits are recorded in [Validation](validation.md); it is a historical record, not evidence of visual review for later translations.

## Organization

| Folder or file | Responsibility |
| --- | --- |
| `engine/` | Independent synthetic engine |
| `shared/` | Catalog and common result queries |
| `storage/` | Schema, integrity and file persistence |
| `cli.js` | Runs without the website |
| `server.js` | Local service and interface file access |
| `web/` | Interface derived from SIMISA_entrega and preserved assets |
| `web/js/i18n.js`, `web/js/locales/` | Language preference, presentation helpers and English messages |
| `data/runs/` | Persisted runs |
| `data/legacy-*/` | Earlier engine examples, archived unchanged |
| `shared/crew.js` | Fictional crew, roles and access rules |
| `Publicar SIMISA.cmd` | Server and Cloudflare tunnel for a public link |
| `test/` | Functional tests |
| `docs/en/`, `docs/es/` | Documentation by language |
| `docs/fuentes-originales.json` | Original-file checksum manifest |
