import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import * as typst from "typst";
import { buildModel } from "../src/model.js";
import { ensureTypstBinary } from "../src/setup-typst.js";
import { loadSpec } from "../src/spec.js";
import { typstDocument } from "../src/typst.js";
import { FIXTURES, PINNED_DATE, ROOT, tempDir } from "./helpers.js";

describe("fixture compilation", () => {
  test("minimal and rich fixtures compile through the Typst template", async () => {
    for (const fixture of ["minimal.yaml", "rich.yaml"]) {
      const temp = tempDir("openapi-ts-compile-");
      try {
        cpSync(join(ROOT, "templates"), join(temp, "templates"), { recursive: true });
        mkdirSync(join(temp, "build", "generated"), { recursive: true });
        const model = buildModel(loadSpec(join(FIXTURES, fixture)), PINNED_DATE, { mode: "reference" });
        writeFileSync(join(temp, "build", "generated", "data.typ"), typstDocument(model), "utf-8");
        ensureTypstBinary();
        const output = join(temp, "out.pdf");
        await typst.compile(join(temp, "templates", "main.typ"), output, { root: temp });
        assert.ok(existsSync(output), fixture + " should compile to a PDF");
      } finally {
        rmSync(temp, { recursive: true, force: true });
      }
    }
  });
});
