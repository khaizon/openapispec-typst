# AGENTS.md

Guidance for agents and humans working in this repository.

## Purpose

Turn OpenAPI **3.1** documents into a professional, human-readable PDF API
reference using Typst. The checked-in example is the fictional **PocketDex**
API in `specs/pocketdex.yaml`; it exists to demonstrate the converter without
publishing any real API, customer or production data.

The project is also the privacy-safe public home of the TypeScript converter
that was originally extracted from a private OpenAPI documentation pipeline.
Keep it generic.

## Non-negotiable rules

1. **Never edit `build/`** — it is generated. Regenerate with `npm run build`.
2. **`templates/lib.typ` owns presentation; the converter produces data only.**
   Do not hard-code layout in TypeScript, and do not parse YAML in Typst.
3. **Run `npm run build` and `npm run check` before committing** converter,
   template or build changes.
4. **Publish atomically** — the build writes a temporary PDF and renames it into
   `dist/`. Never write the final PDF in place.
5. **Keep the demo fictional.** No real company names, customer data, hostnames,
   credentials or production API descriptions.
6. **Do not expose OpenAPI mechanics** in the PDF: no operation IDs, `$ref`
   syntax, `allOf` labels, component names in endpoint sections, or raw YAML
   hierarchy. Model names are navigation targets, so they are fine.
7. **Document shared concepts once.** Authentication, request conventions,
   error payloads, success envelopes and reusable models live in dedicated
   sections; endpoints link to them.
8. **Examples are representative.** Keep all examples in the data model, render
   only a few, and say how many exist when trimming.
9. Keep generated data deterministic: no random ordering, no timestamps other
   than the explicit `--date` input.
10. Only local `$ref`s are supported; reject external references clearly.
11. Commit `dist/` with source changes that alter the PDF.

## Document structure

`api-document(spec)` renders:

1. Cover page.
2. Clickable table of contents.
3. Overview: purpose, audience, servers, API groups, document details.
4. Authentication & Authorization.
5. Request Conventions: content types, pagination, sorting/filtering, dates.
6. Response & Error Conventions: error envelope, status reference, examples,
   success envelopes.
7. Endpoint Summary.
8. Endpoint reference grouped by tag: title, method + path, purpose,
   authentication label, parameter tables, request body with inline fields or
   oneOf variants, examples, endpoint-specific responses plus "Common errors ↗",
   and Notes.
9. Data Models: primary, versioned diffs, response envelopes, small and helper
   models.
10. Enumerations.
11. Specification Notes.

## Architecture

```
spec YAML/JSON
      |
      v
src/spec.ts       load + validate 3.1 + resolve $refs
      |
      v
src/model.ts      normalise into plain JS data
      |           (operations, schemas, examples, dedup groups)
      v
src/typst.ts      encode as Typst literals
      |
      v
build/generated/data.typ ---> templates/main.typ
                                  | imports templates/lib.typ
                                  v
                 src/build.ts -> typst.compile() [npm]
                                  |
                                  v
                    dist/pocketdex.pdf + dist/index.html
```

- `src/spec.ts`: `yaml` parsing, top-level validation, JSON-pointer
  `$ref` lookup and a reusable `Resolver`. `validateRefs()` returns a list of
  problems.
- `src/model.ts`: one class, `Model.build()`. Produces a plain object tree
  with hyphenated keys; optional schema fields always exist with defaults.
- `src/typst.ts`: serialises values to Typst literals. Strings escape
  backslashes, quotes and newlines; identifiers stay bare, other keys are
  quoted.
- `src/cli.ts`: `--check`, `--out-dir`, `--json`, `--index-template`,
  `--index-out`, `--pdf-name`, `--date`, `--mode`.
- `src/build.ts`: writes generated data and the landing page, calls
  `typst.compile(input, output, { root })`, then atomically publishes.
- `src/setup-typst.ts`: the `typst` npm package bundles Typst 0.10, so
  postinstall replaces its binary with the official 0.15.1 CLI from
  `@flukxr/typst-cli`. Keep the typed `typst.compile()` usage; replace this shim
  when the npm package ships a current compiler.

### Data contract

Top level: `openapi, title, version, description, terms-of-service, contact,
license, servers, tags, security-schemes, authentication, operations, schemas,
data-models, named-responses, named-parameters, response-groups, error-reference,
conventions, enum-reference, specification-notes, config, stats, generated`.

- `operations[]`: `method, path, summary, heading, description, purpose, notes,
  notes-first, notes-rest, tag, tags, operation-id, deprecated, security,
  security-inherited, security-exception, parameters, request-body, responses,
  shared-response-refs, external-docs`.
- `request-body.content[]` adds `request-model`: `kind` (`object` or
  `one-of`), `name`, `fields` (max 7), `field-count`,
  `required-count`, `truncated`; oneOf adds `variants[]` with `name`,
  `label`, `note` and `fields`.
- `parameters[]`: `name, location, required, deprecated, description, schema,
  type-label, enum-values, constraints, default-text, style, explode, examples,
  example-short`. Sorted path → query → header → cookie, then name.
- `request-body`: `required, description, content[]`; each entry has
  `media-type, schema, examples, examples-show, examples-total`.
- `responses[]`: `status, status-class, description, short-description,
  shared, content[], headers[]`.
- `shared-response-refs[]`: unique shared groups with `status, status-class,
  label, group-id, group-kind`. Error groups are not repeated inside endpoints.
- `schemas[]`: all component schemas. `data-models[]`: reusable non-error
  models with `role` (`primary|versioned|envelope|small|helper`), `usage-count`,
  optional `diff-from` and `diff-changes[]`.
- `schemas[].node` is recursive: `kind` = `ref | object | array | one-of |
  any-of | primitive | any`; objects add `properties[], required-names,
  required-count, property-count, composition, additional`; arrays add
  `items`; variants add `variants`.
- `response-groups[]`: `id, label, description, kind, components, schemas,
  examples, examples-total`.
- `error-reference`: `envelope`, `models`, `statuses[]`, `examples[]`,
  `examples-total`, `legacy`, `note`.
- `authentication`: `default` (`requirements, count, total`), `schemes[]`,
  `exceptions[]`.
- `conventions`: `media-types[], headers[], pagination{parameters, model-name},
  sorting{parameters}, filtering{parameters}, datetime-example`.
- `enum-reference[]`: `name, values, used-in[]`.
- `specification-notes[]`: plain strings, potential inconsistencies prefixed
  "Potential specification inconsistency:".
- `config`: effective `mode`, example limits and model strategy.
- `stats`: paths, operations, tags, schemas, named responses/parameters
  (tests assert the PocketDex counts).

## Commands

```bash
npm install     # installs deps and aligns the npm typst binary
npm run build   # typecheck -> normalise -> typst.compile() -> dist/
npm run check   # node:test suite via tsx
npm run serve   # static server for dist/ on :8000
npm run fmt     # typstyle -i templates/
npm run typecheck
make build MODE=concise
```

`npm run build` honours `SPEC`, `NAME`, `MODE` and `BUILD_DATE`. Flags are also
accepted: `npm run build -- --mode concise --name my-api`.

## TypeScript / npm notes

- Node 22+, ESM. `tsconfig.json` uses `module: NodeNext`; relative imports keep
  the `.js` suffix.
- Run TypeScript through `tsx` (build, CLI, tests). `tsc --noEmit` is the type
  gate and runs as the `prebuild` hook.
- Tests use `node:test` via `tsx --test tests/*.test.ts`. No Jest/Vitest.
- `yaml` parses specs; timestamps remain strings.
- The `typst` npm package exposes `compile/query/fonts`; its bundled compiler is
  older than the template, so `src/setup-typst.ts` aligns it with the 0.15.1 CLI
  from `@flukxr/typst-cli`. Do not commit `node_modules`.

## Typst notes and gotchas

- `templates/main.typ` imports `/build/generated/data.typ` and calls
  `api-document(spec)`. Compile with root `.` (passed through the npm API).
- `@preview/cmarker:0.1.6` renders Markdown descriptions; examples are raw JSON.
- Dynamic labels must live in markup and attach to a heading:
  `[#heading(...)#label("schema-" + name)]`. Bare `label()` in code produces
  "not attached" warnings.
- Function parameters with defaults are named in Typst:
  `schema-body(node, depth: depth + 1)`.
- Hyphenated identifiers are valid (`spec.operations.at(0).request-body`).
- Front matter uses `page(header: none, footer: none, numbering: none)`;
  the page counter resets with `counter(page).update(1)` after the TOC.
- Tables set `hyphenate: false`; long paths use zero-width breaks after `/`.
- Page-break heuristics: endpoint heading/signature/purpose/auth are one
  unbreakable block; small parameter/response tables stay together; short JSON
  examples and the first Notes paragraph are unbreakable.
- `running-endpoint` state drives the "<endpoint> · continued" header on
  continuation pages and resets at the end of each endpoint.
- Data Models cards render by `role`; `--mode exhaustive` renders full cards.
- Style tokens and helpers live at the top of `templates/lib.typ`.

## Tests and fixtures

- `npm run check` runs model, CLI, fixture and PDF tests.
- `tests/fixtures/` covers minimal specs, composition/recursion and failure
  modes. Extend fixtures when changing schema rendering.
- `tests/pdf.test.ts` checks the committed PDF; run `npm run build` first.
- Keep the checked-in spec and generated text fictional; never add real
  company, customer, host or credential data to fixtures.

## Git conventions

- Small, focused commits with imperative subjects.
- Never commit `build/` or `node_modules`; `dist/` is committed intentionally.
