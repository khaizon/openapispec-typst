import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { FIXTURES, PINNED_DATE, ROOT, SPEC, runCli, tempDir } from "./helpers.js";
import { buildModel } from "../src/model.js";
import { loadSpec } from "../src/spec.js";
import { typstDocument } from "../src/typst.js";

describe("converter CLI", () => {
  test("--check validates and writes nothing", () => {
    const tmp = tempDir();
    const outDir = join(tmp, "nested", "generated");
    const result = runCli([
      SPEC,
      "--check",
      "--json",
      join(outDir, "spec.json"),
      "--date",
      PINNED_DATE,
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /parsed: 14 operations, 47 schemas, 11 named responses, 6 tags/);
    assert.match(result.stdout, /spec: PocketDex API v1\.0\.0 \(3\.1\.0\)/);
    assert.doesNotMatch(result.stdout, /wrote/);
    assert.equal(existsSync(outDir), false);
  });

  test("documented invocation writes data, json and index", () => {
    const tmp = tempDir();
    const outDir = join(tmp, "build", "generated");
    const jsonPath = join(outDir, "spec.json");
    const indexOut = join(tmp, "index.html");
    const result = runCli([
      join(FIXTURES, "minimal.yaml"),
      "--out-dir",
      outDir,
      "--json",
      jsonPath,
      "--index-template",
      join(ROOT, "templates", "index.html"),
      "--index-out",
      indexOut,
      "--pdf-name",
      "pocketdex.pdf",
      "--date",
      PINNED_DATE,
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(outDir, "data.typ")));
    assert.ok(existsSync(jsonPath));
    assert.ok(existsSync(indexOut));
    assert.match(result.stdout, /wrote /);
    const html = readFileSync(indexOut, "utf-8");
    assert.match(html, /<title>Minimal Ping API 1\.0\.0 — API Reference<\/title>/);
    assert.match(html, /<h1>Minimal Ping API<\/h1>/);
    assert.match(html, /1 endpoints · 0 schemas/);
    assert.match(html, /OpenAPI 3\.1\.0/);
    assert.match(html, /Generated 2026-01-01/);
    assert.match(html, /href="pocketdex\.pdf"/);
    assert.doesNotMatch(html, /\{\{/);
  });

  test("broken local ref exits one", () => {
    const tmp = tempDir();
    const result = runCli([join(FIXTURES, "broken_ref.yaml"), "--out-dir", join(tmp, "gen")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /error:/);
    assert.match(result.stderr, /DoesNotExist/);
    assert.match(result.stderr, /unresolvable \$ref/);
    assert.equal(existsSync(join(tmp, "gen", "data.typ")), false);
  });

  test("external refs are rejected", () => {
    const tmp = tempDir();
    const result = runCli([join(FIXTURES, "external_ref.yaml"), "--out-dir", join(tmp, "gen")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unsupported \$ref/);
    assert.match(result.stderr, /only local references are supported/);
    assert.match(result.stderr, /shared\.yaml/);
  });

  test("OpenAPI 3.0 is accepted", () => {
    const tmp = tempDir();
    const result = runCli([join(FIXTURES, "openapi30.yaml"), "--out-dir", join(tmp, "gen")]);
    assert.equal(result.status, 0);
    assert.ok(existsSync(join(tmp, "gen", "data.typ")), "3.0 fixture should normalise");
  });

  test("missing spec reports a clean error", () => {
    const tmp = tempDir();
    const result = runCli([join(tmp, "no-such.yaml"), "--out-dir", join(tmp, "gen")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /cannot read spec/);
    assert.doesNotMatch(result.stderr, /Traceback|at Module/);
  });

  test("identical input and date produce identical data", () => {
    const spec = loadSpec(SPEC);
    const first = typstDocument(buildModel(spec, PINNED_DATE, { mode: "reference" }));
    const second = typstDocument(buildModel(spec, PINNED_DATE, { mode: "reference" }));
    assert.equal(first, second);
    const otherDate = typstDocument(buildModel(spec, "2026-02-02", { mode: "reference" }));
    assert.notEqual(first, otherDate);
  });

  test("mode flag changes example density", () => {
    const tmp = tempDir();
    for (const [mode, expected] of [["concise", 1], ["exhaustive", 4]] as const) {
      const outDir = join(tmp, mode);
      const jsonPath = join(outDir, "spec.json");
      const result = runCli([SPEC, "--out-dir", outDir, "--json", jsonPath, "--mode", mode]);
      assert.equal(result.status, 0, result.stderr);
      const model = JSON.parse(readFileSync(jsonPath, "utf-8"));
      assert.equal(model.config.mode, mode);
      const register = model.operations.find((operation: any) => operation["operation-id"] === "registerTrainer");
      assert.equal(register["request-body"].content[0]["examples-show"].length, expected);
    }
  });

  test("unknown mode fails clearly", () => {
    const tmp = tempDir();
    const result = runCli([SPEC, "--out-dir", join(tmp, "gen"), "--mode", "dense"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unsupported mode "dense"/);
  });
});
