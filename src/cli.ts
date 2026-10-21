import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MODES, buildModel } from "./model.js";
import { SpecError, loadSpec, validateRefs } from "./spec.js";
import { typstDocument } from "./typst.js";

export interface CliOptions {
  spec: string;
  outDir: string;
  jsonPath?: string;
  indexTemplate?: string;
  indexOut?: string;
  pdfName: string;
  date?: string;
  mode: string;
  check: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    spec: "",
    outDir: "build/generated",
    pdfName: "openapi.pdf",
    mode: "reference",
    check: false,
  };
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") options.check = true;
    else if (arg === "--out-dir") options.outDir = argv[++index];
    else if (arg === "--json") options.jsonPath = argv[++index];
    else if (arg === "--index-template") options.indexTemplate = argv[++index];
    else if (arg === "--index-out") options.indexOut = argv[++index];
    else if (arg === "--pdf-name") options.pdfName = argv[++index];
    else if (arg === "--date") options.date = argv[++index];
    else if (arg === "--mode") options.mode = argv[++index];
    else if (arg.startsWith("-")) throw new SpecError("unknown option " + arg);
    else positional.push(arg);
  }
  options.spec = positional[0] ?? "";
  if (!options.spec) throw new SpecError("missing spec path");
  if (!(options.mode in MODES)) {
    throw new SpecError("unsupported mode " + JSON.stringify(options.mode));
  }
  return options;
}

export function renderIndex(template: string, spec: any, pdfName: string): string {
  const replacements: Record<string, string> = {
    "{{title}}": escapeHtml(spec.title || "API Reference"),
    "{{version}}": escapeHtml(spec.version),
    "{{openapi}}": escapeHtml(spec.openapi),
    "{{generated}}": escapeHtml(spec.generated.date),
    "{{pdf}}": escapeHtml(pdfName),
    "{{operation-count}}": String(spec.stats.operations),
    "{{schema-count}}": String(spec.stats.schemas),
  };
  let output = template;
  for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value);
  return output;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function main(argv: string[]): number {
  try {
    const options = parseArgs(argv);
    const date = options.date ?? today();
    const doc = loadSpec(options.spec);
    const problems = validateRefs(doc);
    if (problems.length > 0) {
      for (const problem of problems) console.error("error: " + problem);
      return 1;
    }
    const spec = buildModel(doc, date, { mode: options.mode });

    console.log("spec: " + spec.title + " v" + spec.version + " (" + spec.openapi + ")");
    console.log(
      "parsed: " + spec.stats.operations + " operations, "
      + spec.stats.schemas + " schemas, "
      + spec.stats["named-responses"] + " named responses, "
      + spec.stats.tags + " tags",
    );

    if (options.check) return 0;

    mkdirSync(options.outDir, { recursive: true });
    const dataPath = options.outDir + "/data.typ";
    writeFileSync(dataPath, typstDocument(spec), "utf-8");
    console.log("wrote " + dataPath);

    if (options.jsonPath) {
      mkdirSync(dirname(options.jsonPath), { recursive: true });
      writeFileSync(options.jsonPath, JSON.stringify(spec, null, 2) + "\n", "utf-8");
      console.log("wrote " + options.jsonPath);
    }

    if (options.indexTemplate && options.indexOut) {
      const template = readFileSync(options.indexTemplate, "utf-8");
      mkdirSync(dirname(options.indexOut), { recursive: true });
      writeFileSync(options.indexOut, renderIndex(template, spec, options.pdfName), "utf-8");
      console.log("wrote " + options.indexOut);
    }
    return 0;
  } catch (error) {
    console.error("error: " + (error instanceof Error ? error.message : String(error)));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
