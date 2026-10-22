import assert from "node:assert/strict";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { buildDocument } from "../src/build.js";
import {
  EnhancementError,
  discoverEnhancementModules,
  resolveSpecId,
  writeEnhancementBundle,
} from "../src/enhancements.js";
import {
  PINNED_DATE,
  ROOT,
  SPEC,
  pdfText,
  pdfinfoPages,
  tempDir,
} from "./helpers.js";

function projectWithOverrides(): string {
  const dir = tempDir("openapi-enh-");
  cpSync(join(ROOT, "templates"), join(dir, "templates"), { recursive: true });
  mkdirSync(join(dir, "overrides"), { recursive: true });
  return dir;
}

const MODULE = readFileSync(join(ROOT, "tests", "fixtures", "enhancement-module.typ"), "utf-8");

async function buildProject(dir: string, overrides?: string, hideEnhancements = false) {
  return buildDocument({
    spec: SPEC,
    root: dir,
    name: "pocketdex",
    date: PINNED_DATE,
    overrides,
    hideEnhancements,
  });
}

describe("enhancement modules", () => {
  test("discovers modules and ignores helper modules", () => {
    const dir = projectWithOverrides();
    try {
      writeFileSync(join(dir, "overrides", "one.typ"), "#let meta = ()\n#let overrides = (:)\n");
      writeFileSync(join(dir, "overrides", "_helper.typ"), "#let helper = 1\n");
      mkdirSync(join(dir, "overrides", "nested"));
      writeFileSync(join(dir, "overrides", "nested", "two.typ"), "#let meta = ()\n#let overrides = (:)\n");
      const modules = discoverEnhancementModules(dir);
      assert.deepEqual(modules.map(module => module.path), [
        "overrides/nested/two.typ",
        "overrides/one.typ",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("explicit path replaces default discovery and must stay inside root", () => {
    const dir = projectWithOverrides();
    try {
      writeFileSync(join(dir, "outside.typ"), "#let meta = ()\n#let overrides = (:)\n");
      writeFileSync(join(dir, "overrides", "default.typ"), "#let meta = ()\n#let overrides = (:)\n");
      assert.throws(
        () => discoverEnhancementModules(dir, "../outside.typ"),
        EnhancementError,
      );
      const explicitDir = join(dir, "explicit");
      mkdirSync(explicitDir);
      writeFileSync(join(explicitDir, "chosen.typ"), "#let meta = ()\n#let overrides = (:)\n");
      const modules = discoverEnhancementModules(dir, explicitDir);
      assert.deepEqual(modules.map(module => module.path), ["explicit/chosen.typ"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("spec IDs come from x-spec-id or explicit override", () => {
    assert.equal(resolveSpecId({ "x-spec-id": "pocketdex" }), "pocketdex");
    assert.equal(resolveSpecId({ "x-spec-id": "pocketdex" }, "pocketdex-v2"), "pocketdex-v2");
    assert.throws(() => resolveSpecId({ "x-spec-id": "PocketDex" }), EnhancementError);
    assert.equal(resolveSpecId({}), "");
  });

  test("bundle includes imported modules and visibility flag", () => {
    const dir = projectWithOverrides();
    try {
      writeFileSync(join(dir, "overrides", "copy.typ"), "#let meta = ()\n#let overrides = (:)\n");
      const bundle = writeEnhancementBundle(dir, discoverEnhancementModules(dir), "pocketdex", false);
      assert.match(bundle, /#import "\/overrides\/copy\.typ"/);
      assert.match(bundle, /enhancement-groups/);
      assert.match(bundle, /show-enhancements = false/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("replace, append, prepend and every supported slot render", async () => {
    const dir = projectWithOverrides();
    try {
      writeFileSync(join(dir, "overrides", "test.typ"), MODULE);
      await buildProject(dir);
      const pdf = join(dir, "dist", "pocketdex.pdf");
      assert.ok((pdfinfoPages(pdf) ?? 0) >= 30);
      const text = pdfText(pdf);
      if (text === null) throw new Error("pdftotext is required for this test");
      for (const marker of [
        "PREPENDED OVERVIEW",
        "APPENDED OVERVIEW",
        "APPENDED TAG",
        "REPLACED PURPOSE",
        "APPENDED BODY",
        "APPENDED NOTES",
        "APPENDED PARAM",
        "APPENDED SCHEMA",
        "APPENDED FIELD",
        "PDF Enhancement",
        "PDF Enhancements",
        "overrides/test.typ",
      ]) {
        assert.ok(text.includes(marker), "missing " + marker);
      }
      assert.ok(!text.includes("Create a trainer profile."), "replaced purpose should be gone");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("hide flag removes markers but keeps content", async () => {
    const dir = projectWithOverrides();
    try {
      writeFileSync(join(dir, "overrides", "test.typ"), MODULE);
      await buildProject(dir, undefined, true);
      const pdf = join(dir, "dist", "pocketdex.pdf");
      const text = pdfText(pdf);
      if (text === null) throw new Error("pdftotext is required for this test");
      assert.ok(text.includes("APPENDED OVERVIEW"));
      assert.ok(text.includes("APPENDED FIELD"));
      assert.ok(!text.includes("PDF Enhancement"));
      assert.ok(!text.includes("PDF Enhancements"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("unknown targets and slots are aggregated", async () => {
    const dir = projectWithOverrides();
    try {
      const bad = [
        "#let meta = (",
        "  version: 1,",
        '  specs: ("pocketdex",),',
        ")",
        "#let overrides = (",
        "  operations: (",
        "    recordEncounter: (",
        "      descriptin: [typo],",
        "    ),",
        "    missingOperation: (",
        "      notes: [missing],",
        "    ),",
        "  ),",
        ")",
        "",
      ].join("\n");
      writeFileSync(join(dir, "overrides", "bad.typ"), bad);
      await assert.rejects(
        () => buildProject(dir),
        (error: Error) => {
          assert.match(error.message, /unknown slot "descriptin"/);
          assert.match(error.message, /Unknown operationId "missingOperation"/);
          assert.match(error.message, /overrides\/bad\.typ/);
          return true;
        },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("equal-priority conflicts fail with both modules", async () => {
    const dir = projectWithOverrides();
    try {
      const moduleText = (name: string) => [
        "#let meta = (",
        "  version: 1,",
        '  specs: ("pocketdex",),',
        "  priority: 0,",
        ")",
        "#let overrides = (",
        "  overview: (",
        "    description: [" + name + "],",
        "  ),",
        ")",
        "",
      ].join("\n");
      writeFileSync(join(dir, "overrides", "a.typ"), moduleText("A"));
      writeFileSync(join(dir, "overrides", "b.typ"), moduleText("B"));
      await assert.rejects(
        () => buildProject(dir),
        (error: Error) => {
          assert.match(error.message, /PDF enhancement conflict at overview\.description/);
          assert.match(error.message, /overrides\/a\.typ/);
          assert.match(error.message, /overrides\/b\.typ/);
          return true;
        },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("higher priority wins without error", async () => {
    const dir = projectWithOverrides();
    try {
      const moduleText = (name: string, priority: number) => [
        "#let meta = (",
        "  version: 1,",
        '  specs: ("pocketdex",),',
        "  priority: " + priority + ",",
        ")",
        "#let overrides = (",
        "  overview: (",
        "    description: [" + name + "],",
        "  ),",
        ")",
        "",
      ].join("\n");
      writeFileSync(join(dir, "overrides", "low.typ"), moduleText("LOW PRIORITY", 1));
      writeFileSync(join(dir, "overrides", "high.typ"), moduleText("HIGH PRIORITY", 2));
      await buildProject(dir);
      const text = pdfText(join(dir, "dist", "pocketdex.pdf"));
      if (text === null) throw new Error("pdftotext is required for this test");
      assert.ok(text.includes("HIGH PRIORITY"));
      assert.ok(!text.includes("LOW PRIORITY"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("unsupported module versions fail explicitly", async () => {
    const dir = projectWithOverrides();
    try {
      const bad = [
        "#let meta = (",
        "  version: 2,",
        '  specs: ("pocketdex",),',
        ")",
        "#let overrides = ()",
        "",
      ].join("\n");
      writeFileSync(join(dir, "overrides", "v2.typ"), bad);
      await assert.rejects(
        () => buildProject(dir),
        /Unsupported meta\.version/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("requires x-spec-id when overrides exist", async () => {
    const dir = projectWithOverrides();
    try {
      const spec = readFileSync(SPEC, "utf-8").replace(/^x-spec-id: pocketdex\n/m, "");
      const specPath = join(dir, "no-id.yaml");
      writeFileSync(specPath, spec);
      writeFileSync(join(dir, "overrides", "test.typ"), MODULE);
      await assert.rejects(
        () => buildDocument({ spec: specPath, root: dir, date: PINNED_DATE }),
        /enhancement modules were found, but the spec has no identity/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
