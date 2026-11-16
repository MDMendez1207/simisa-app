# Tools used and AI disclosure

Updated: November 15, 2026.

[Español](../es/herramientas-e-ia.md) · [Documentation](README.md)

This inventory describes the active application in `simisa-app/`, based on its code, provenance documentation and available work history. Original SIMISA materials were kept as references.

## Application technologies

| Tool or technology | Use in SIMISA | Project evidence |
| --- | --- | --- |
| JavaScript with ES modules | Simulation engine, shared queries, server, CLI and interface | [`package.json`](../../package.json), [`engine/simulator.js`](../../engine/simulator.js), [`web/js/main.js`](../../web/js/main.js) |
| Node.js ≥ 22 | Local execution, standalone simulator and showcase simulation function | [`package.json`](../../package.json), [`server.js`](../../server.js), [`cli.js`](../../cli.js), [`api/simulate.js`](../../api/simulate.js) |
| HTML and CSS | Interface structure, responsive layout, typography and animation | [`web/index.html`](../../web/index.html), [`web/css/app.css`](../../web/css/app.css) |
| SVG | Indicator charts, icons and anatomy navigation elements | [`web/js/chart.js`](../../web/js/chart.js), [`web/views/lateral.html`](../../web/views/lateral.html) |
| PNG and WebP | Anatomy illustrations and visual identity assets | `web/assets/`; [illustration provenance](illustration-provenance.md) |
| JSON and CSV | Results and activity in local files; data and research exports | [`storage/files.js`](../../storage/files.js), [`storage/activity.js`](../../storage/activity.js), [`web/js/sections.js`](../../web/js/sections.js) |
| Native Node.js modules | HTTP server (`node:http`), files (`node:fs/promises`), SHA-256 checksums (`node:crypto`), tests (`node:test`, `node:assert/strict`) | [`server.js`](../../server.js), [`storage/files.js`](../../storage/files.js), [`test/simulation.test.js`](../../test/simulation.test.js) |
| npm | Shortcuts to start, simulate, verify and prepare publication | Scripts in [`package.json`](../../package.json) |

The active app uses browser and Node.js APIs directly and declares no external dependencies in `package.json`. React, Vite, Motion and Recharts proposals in early plans are design history; the inventory above describes the implemented application.

## Development, review and publication

| Tool | Recorded use or status |
| --- | --- |
| Windows and PowerShell | Development and command execution; `.cmd` launchers start the app and prepare a tunnel |
| Git and GitHub | Version control and hosting of the [SIMISA repository](https://github.com/MDMendez1207/simisa-app) |
| Integrated browser and Google Chrome | Functional and visual review at desktop/mobile sizes and console checks; evidence in [Validation](validation.md) |
| Vercel | Publication target configured with [`vercel.json`](../../vercel.json), a [custom build script](../../scripts/build-vercel.js) and a Node.js simulation function; configuration alone is not evidence of deployment |
| Cloudflare / `cloudflared` | Temporary public-link option in [`Publicar SIMISA.cmd`](../../Publicar%20SIMISA.cmd); [recorded validation](validation.md) covers server restrictions and leaves the actual tunnel test pending |
| OpenCode | Auxiliary configuration in the workspace’s `../.opencode/`, including `@opencode-ai/plugin` 1.19.5 and the `simisa-modo-rapido` work policy; these are development-environment files |

## AI tools used

| AI or AI-assisted tool | Recorded contribution |
| --- | --- |
| **Codex (OpenAI)** | Help analyzing the plan and original materials, organizing implementation, writing and reviewing code, preparing and running checks, and drafting documentation under the project owner’s instructions |
| **Codex integrated image generation (OpenAI)** | Creation of body and detail illustrations, variants and visual corrections. [Provenance](illustration-provenance.md) and [generation/correction prompts](../../web/assets/PROMPTS.json) are preserved with the assets |

Available materials identify the tools but do not reliably record the exact language-model version, image model, or provider/model selected in OpenCode. The OpenCode configuration documents the environment without attributing a specific model.

### AI scope within the product

AI assistance was used during construction. The in-app “Smart assistant” uses [programmed local responses and queries](../../web/js/presentation.js) over readings, the selected period and mental check-ins. It does not require a generative AI API.

The [synthetic engine](../../engine/simulator.js) generates measurements using rules and reproducible seeds. Every run’s data comes from that engine. AI-generated illustrations are conceptual 2D assets subject to the limits in their [provenance document](illustration-provenance.md).

## Submission AI disclosure

During SIMISA’s development, OpenAI Codex assisted with material analysis, programming, code review, checks and documentation. Anatomy illustrations were generated using Codex’s integrated image tool; provenance and prompts were preserved. The project owner defined scope decisions and requirements. Measurements come from a reproducible synthetic simulator, and the in-app assistant uses programmed local queries. The prototype and illustrations are for demonstration and have no medical validation.
