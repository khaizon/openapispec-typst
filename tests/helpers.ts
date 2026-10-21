import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildModel } from "../src/model.js";
import { loadSpec } from "../src/spec.js";

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const SPEC = join(ROOT, "specs", "pocketdex.yaml");
export const FIXTURES = join(ROOT, "tests", "fixtures");
export const DIST_PDF = join(ROOT, "dist", "pocketdex.pdf");
export const PINNED_DATE = "2026-01-01";

let cachedReference: any = null;

export function referenceModel(): any {
  if (!cachedReference) cachedReference = modelFor(SPEC);
  return cachedReference;
}

export function modelFor(specPath: string, mode = "reference", date = PINNED_DATE): any {
  return buildModel(loadSpec(specPath), date, { mode });
}

export function tempDir(prefix = "openapi-ts-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function runCli(args: string[], env: Record<string, string> = {}) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", join(ROOT, "src", "cli.ts"), ...args],
    {
      cwd: ROOT,
      encoding: "utf-8",
      env: { ...process.env, ...env },
      timeout: 120_000,
    },
  );
}

export function hasCommand(command: string): boolean {
  return spawnSync("sh", ["-c", "command -v " + command], { encoding: "utf-8" }).status === 0;
}

export function pdfinfoPages(pdf: string): number | null {
  if (!hasCommand("pdfinfo")) return null;
  try {
    const output = execFileSync("pdfinfo", [pdf], { encoding: "utf-8" });
    const match = /^Pages:\s+(\d+)/m.exec(output);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

export function pdfText(pdf: string): string | null {
  if (!hasCommand("pdftotext")) return null;
  try {
    return execFileSync("pdftotext", [pdf, "-"], { encoding: "utf-8" });
  } catch {
    return null;
  }
}

export function normalize(text: string): string {
  return text
    .replace(/[\u00ad\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ");
}
