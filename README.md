# openapispec-typst

Turn an OpenAPI **3.1** document into a polished, navigable PDF with [Typst](https://typst.app).

This repository is a **privacy-safe reference project** for the converter. The
bundled specification is a fictional **PocketDex API** — no production,
customer or third-party API data is included.

[PDF](dist/pocketdex.pdf) · [landing page](dist/index.html) · [spec](specs/pocketdex.yaml)

<a href="docs/preview-cover.png"><img src="docs/preview-cover.png" width="49%" alt="Cover page"></a>
<a href="docs/preview-endpoint.png"><img src="docs/preview-endpoint.png" width="49%" alt="Endpoint page"></a>

## Features

- Designed cover, clickable table of contents, PDF outline/bookmarks, running
  headers and page footers.
- Structured front matter: overview, base URLs, authentication, request
  conventions, response/error conventions, and an endpoint summary.
- Endpoints grouped by tag, with method badges, wrapped paths, deprecated
  markers, and a consistent section order.
- **Local request comprehension:** request bodies show top-level fields inline;
  oneOf request modes become a variant table with required fields; the full
  model is linked from the endpoint.
- Representative request/response examples with JSON syntax highlighting,
  human-readable titles and explicit example counts.
- Deduplicated authentication, error and success-envelope documentation, with
  a small "Common errors" link per endpoint.
- **Classified Data Models:** primary models, versioned models rendered as
  diffs against their base version, compact response envelopes, small reusable
  models and helper models.
- Enumerations index and Specification Notes for source observations.
- Three document densities: `concise`, `reference` (default) and `exhaustive`.
- TypeScript pipeline, npm scripts, atomic build output and fixture tests.

## Quick start

```bash
npm install
npm run build
npm run serve      # http://localhost:8000
npm run check
npm run typecheck
```

`npm install` runs a postinstall step that aligns the typed `typst` npm API
(which currently bundles an older Typst) with the official 0.15.1 CLI
distributed by `@flukxr/typst-cli`. The build still calls the typed API:

```ts
import * as typst from "typst";
await typst.compile("templates/main.typ", "dist/pocketdex.pdf", { root: "." });
```

## Document modes

```bash
npm run build -- --mode concise
MODE=exhaustive npm run build
make build MODE=concise
```

| Mode | Behaviour |
| --- | --- |
| `concise` | one representative example per operation, compact models |
| `reference` | balanced examples, classified models, inline request fields |
| `exhaustive` | all examples and full model tables |

## Use another spec

```bash
SPEC=specs/my-api.yaml NAME=my-api npm run build
```

The build writes `dist/my-api.pdf` and a landing page pointing at it. The
converter accepts local OpenAPI 3.1 YAML/JSON and resolves local `$ref`s only;
external references are rejected with a clear error.

## Architecture

```
spec YAML/JSON
      |
      v
src/spec.ts       load + validate 3.1 + resolve $refs
src/model.ts      normalise, deduplicate, classify, apply mode
src/typst.ts      encode build/generated/data.typ
src/build.ts      typst.compile() -> atomic dist/ publish
```

| Path | Purpose |
| --- | --- |
| `specs/pocketdex.yaml` | Fictional PocketDex OpenAPI 3.1 demo |
| `src/spec.ts` | YAML loader, `$ref` resolver, validation |
| `src/model.ts` | Normalisation, classification, deduplication |
| `src/typst.ts` | Typst literal encoder |
| `src/cli.ts` | Converter CLI |
| `src/build.ts` | PDF build and atomic publish |
| `templates/lib.typ` | Layout, theme and PDF components |
| `templates/main.typ` | Document entry point |
| `templates/index.html` | Landing page template |
| `tests/*.test.ts` | Node test suite and fixtures |
| `dist/` | Generated PDF and landing page |

## Customising

All visual design lives in `templates/lib.typ`: palette, fonts, method and
status colours, page margins, cover composition, tables and schema cards. The
converter only writes data, so you can restyle without touching TypeScript.

`npm run fmt` runs `typstyle`; `make watch` recompiles on save (run
`npm run build` once first).

## Tests

```bash
npm run check
```

The suite covers model invariants, mode density, CLI failures, fixture
compilation and the rendered PDF.

## Notes

- All characters, species, trainers, regions and items are fictional.
- `build/` and `node_modules/` are ignored; `dist/` is committed so the
  generated PDF can be downloaded directly from the repository.
- `@preview/cmarker:0.1.6` is fetched on the first compile and cached by
  Typst in `~/.cache/typst/packages/`.
