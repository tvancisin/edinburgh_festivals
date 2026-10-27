# AGENTS.md

> **Project:** A static, mobile-responsive public exploration of Edinburgh festival data from 2012 onward. It supports public discovery, research, and informed decision-making by festival organisers.
>
> **Core constraints:** Data comes from web-downloaded CSV files; visualisations must be methodologically transparent, accessible to WCAG 2.2 AA, and deployable to GitHub Pages without a backend.

## Toolchain

| Action | Command | Notes |
| --- | --- | --- |
| Develop | `yarn dev` | Vite development server |
| Type check | `yarn run check` | Svelte and TypeScript checks |
| Build | `yarn build` | Production build |

## Implementation conventions

- Use Svelte's legacy reactive syntax, including `$:`; do not introduce runes.
- Render visualisations declaratively in Svelte. Keep SVG and DOM rendering in component markup; use D3 for `csv`/`json` loading, parsing, transformations, scales, layouts, and paths. Always import all of D3 as a namespace (`import * as d3 from "d3"`) and use namespaced functions such as `d3.arc()` and `d3.scaleLinear()`.
- Prefer SVG. Give each visualisation its own component and place shared, typed data and formatting helpers in `src/lib`.
- Keep data loading, D3 `csv`/`json` calls, raw-row schemas, parsing, caching, and transformations outside Svelte components. Put this logic in a dedicated typed module under `src/lib/utils`, export loaders and derived-data helpers from it, and pass loaded data into the application or relevant components.
- Organise reusable logic in focused files under `src/lib/utils`; do not add to a catch-all utility file. For example, keep CSV loading and transformations in `festivalData.ts`, and keep static festival timeline configuration in `festivals.js`.
- In every visualisation component, bind the rendered container's current dimensions with `bind:clientWidth={width}` and `bind:clientHeight={height}`. Use these local `width` and `height` values to calculate responsive layout, scales, and SVG dimensions; do not rely on fixed viewport or screen measurements. Do not use SVG `viewBox` or viewport-based sizing for responsiveness.
- Use plain component-scoped CSS: keep component-specific rules in that component's `<style>` block, and reserve `app.css` for global resets, typography defaults, and shared design tokens. Use US English in interface copy and documentation.

## Data-handling standard

- Define and export a type for every raw source row. Load raw rows without mutating source files, and retain the raw row on every derived record when a transformation is applied.
- Define a separate, exported derived-data type with descriptive lower-camel-case properties. Keep raw source column names only at the loading boundary.
- Make every transformation explicit in a named helper under `src/lib/utils`: parse numeric and date values, normalise blank values, split lists, filter, group, aggregate, or calculate fields there rather than inline in components.
- Represent absent, malformed, or inapplicable numeric and date values as `null`; do not coerce them to zero, current dates, or other inferred values.
- Do not silently drop, deduplicate, filter, sort, aggregate, or impute rows. If any of these operations are needed, export a clearly named function, document its method and effect, and preserve access to the unmodified raw data.
- Cache completed data loads in the data module. If a load fails, clear its failed cache entry so a later request can retry.
- Components may hold loaded or derived data as state and pass it to child components, but must not parse, transform, or fetch data themselves.

## Judgment boundaries

**NEVER**

- Modify original source CSV files or present calculated or interpretive claims as source facts.
- Rely on color as the only visual encoding, or use hover as the only way to access information.
- Use imperative D3 DOM rendering for visualisations.
- Make causal claims, or describe patterns as success, growth, or decline, unless the documented method directly supports the claim.

**ASK**

- Before adding dependencies, charting or mapping libraries, analytics services, external fonts, or other third-party services.
- Before using more than one highlight color or any richer color scheme.
- Before introducing a metric, interpretive framing, animation, or interaction beyond basic filters, tooltips, and responsive resizing.
- Before deleting or replacing source data; changing the data schema; changing deployment configuration; publishing a release; or introducing a server, database, authentication, or another backend service.

**ALWAYS**

- Preserve source provenance: record each source URL, download date, and version where available. Keep raw CSV rows and derived data separately typed.
- Update the relevant provenance and methodology whenever source data, transformations, or a visualisation's interpretation changes.
- Make user-visible work responsive from narrow screens upward, keyboard and touch accessible, respectful of reduced-motion preferences, and understandable without the visual alone.
- Provide clear loading, empty, and error states for data views. Include a text-based equivalent or concise written takeaway for every visualisation.
- Use a neutral palette with, by default, at most one highlight color. Ensure adequate contrast, labels, or patterns wherever color is used.
- Run the applicable type checks and production build before considering a user-visible change complete.

## Agent compatibility

`AGENTS.md` is the canonical project guidance. `CLAUDE.md` imports this file for Claude Code; workspace settings enable `AGENTS.md` support in GitHub Copilot.
