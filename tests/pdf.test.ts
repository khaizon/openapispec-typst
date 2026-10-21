import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, test } from "node:test";
import { DIST_PDF, normalize, pdfText, pdfinfoPages, referenceModel } from "./helpers.js";

const model = referenceModel();

describe("published PocketDex PDF", () => {
  test("has the expected page count and content", (t) => {
    if (!existsSync(DIST_PDF)) {
      t.skip("run npm run build before the PDF tests");
      return;
    }
    const pages = pdfinfoPages(DIST_PDF);
    if (pages === null) {
      t.skip("pdfinfo is not installed");
      return;
    }
    assert.ok(pages >= 30, "expected at least 30 pages, got " + pages);
    const text = pdfText(DIST_PDF);
    if (text === null) {
      t.skip("pdftotext is not installed");
      return;
    }
    const flat = normalize(text);
    const compact = flat.replace(/\s+/g, "");
    for (const operation of model.operations) {
      assert.ok(compact.includes(operation.path.replace(/\s+/g, "")), "missing path " + operation.path);
    }
    for (const schema of model.schemas) {
      assert.ok(compact.includes(schema.name), "missing schema " + schema.name);
    }
    for (const expected of [
      "Endpoint Summary",
      "Request variants",
      "Full model:",
      "Versioned models",
      "Response envelopes",
      "Common errors",
      "Potential specification inconsistency",
    ]) {
      assert.ok(flat.includes(expected), "missing structure text " + expected);
    }
    for (const forbidden of ["SHARED RESPONSES", "Operation ID:", "allOf:", "{{"]) {
      assert.ok(!flat.includes(forbidden), "unexpected OpenAPI mechanics " + forbidden);
    }
  });
});
