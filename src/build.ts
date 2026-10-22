import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as typst from "typst";
import { renderIndex } from "./cli.js";
import {
  EnhancementError,
  discoverEnhancementModules,
  resolveSpecId,
  writeEnhancementBundle,
} from "./enhancements.js";
import { buildModel } from "./model.js";
import { ensureTypstBinary } from "./setup-typst.js";
import { SpecError, loadSpec, validateRefs } from "./spec.js";
import { typstDocument } from "./typst.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export interface BuildOptions {
  spec?: string;
  name?: string;
  mode?: string;
  date?: string;
  root?: string;
  overrides?: string;
  specId?: string;
  hideEnhancements?: boolean;
  /** Directory the PDF is published to. Defaults to <root>/dist. */
  outDir?: string;
  /** Also render the per-document landing page (dist/index.html). Defaults to true. */
  index?: boolean;
  /** Directory with additional fonts. Defaults to <root>/fonts when present. */
  fontPath?: string;
}

export interface BuildResult {
  pdf: string;
  pages: number | null;
  spec: any;
}

function pagesOf(pdf: string): number | null {
  try {
    const output = execFileSync("pdfinfo", [pdf], { encoding: "utf-8" });
    const match = /^Pages:\s+(\d+)/m.exec(output);
    return match ? Number(match[1]) : null;
  } catch {
    // pdfinfo is unavailable; fall back to the macOS metadata indexer.
    try {
      const output = execFileSync("mdls", ["-name", "kMDItemNumberOfPages", "-raw", pdf], { encoding: "utf-8" });
      const pages = Number(output.trim());
      return Number.isFinite(pages) && pages > 0 ? pages : null;
    } catch {
      return null;
    }
  }
}

export async function buildDocument(options: BuildOptions = {}): Promise<BuildResult> {
  const root = options.root ?? ROOT;
  const specPath = options.spec ?? "specs/pocketdex.yaml";
  const name = options.name ?? "pocketdex";
  const mode = options.mode ?? "reference";
  const date = options.date ?? new Date().toISOString().slice(0, 10);

  const outDir = options.outDir ?? join(root, "dist");
  const withIndex = options.index !== false;

  const doc = loadSpec(specPath);
  const problems = validateRefs(doc);
  if (problems.length > 0) throw new SpecError(problems.join("\n"));

  const modules = discoverEnhancementModules(root, options.overrides);
  const specId = resolveSpecId(doc, options.specId);
  if (modules.length > 0 && !specId) {
    throw new EnhancementError(
      "enhancement modules were found, but the spec has no identity. "
        + "Add x-spec-id to the OpenAPI document or pass --spec-id/SPEC_ID.",
    );
  }

  const spec = buildModel(doc, date, { mode });
  spec["spec-id"] = specId;

  const generatedDir = join(root, "build", "generated");
  mkdirSync(generatedDir, { recursive: true });
  const dataPath = join(generatedDir, "data.typ");
  writeFileSync(dataPath, typstDocument(spec), "utf-8");
  writeFileSync(join(generatedDir, "spec.json"), JSON.stringify(spec, null, 2) + "\n", "utf-8");
  const enhancementPath = join(generatedDir, "enhancements.typ");
  writeFileSync(
    enhancementPath,
    writeEnhancementBundle(root, modules, specId, !options.hideEnhancements),
    "utf-8",
  );
  console.log("wrote " + dataPath);
  console.log(
    "enhancements: " + modules.length + " module(s), spec id "
      + (specId ? JSON.stringify(specId) : "(none)"),
  );

  let indexHtml: string | null = null;
  if (withIndex) {
    const template = readFileSync(join(root, "templates", "index.html"), "utf-8");
    indexHtml = renderIndex(template, spec, name + ".pdf");
    writeFileSync(join(root, "build", "index.html"), indexHtml, "utf-8");
  }

  ensureTypstBinary();
  mkdirSync(outDir, { recursive: true });
  const tmpPdf = join(root, "build", name + ".tmp.pdf");
  rmSync(tmpPdf, { force: true });
  const fontPath = options.fontPath ?? (existsSync(join(root, "fonts")) ? join(root, "fonts") : undefined);
  console.log("==> compiling templates/main.typ with typst npm API");
  await typst.compile(join(root, "templates", "main.typ"), tmpPdf, {
    root,
    ...(fontPath ? { fontPath } : {}),
  });
  const pdf = join(outDir, name + ".pdf");
  renameSync(tmpPdf, pdf);
  chmodSync(pdf, 0o644);

  if (withIndex && indexHtml) {
    const indexOut = join(outDir, "index.html");
    const tmpIndex = join(outDir, ".index." + process.pid + ".html");
    writeFileSync(tmpIndex, indexHtml, "utf-8");
    chmodSync(tmpIndex, 0o644);
    renameSync(tmpIndex, indexOut);
  }

  const pages = pagesOf(pdf);
  console.log(
    "==> published " + pdf + (pages ? " (" + pages + " pages)" : "")
    + (withIndex ? " and its landing page" : ""),
  );
  return { pdf, pages, spec };
}
