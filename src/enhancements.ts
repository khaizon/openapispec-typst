import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { encode } from "./typst.js";

export class EnhancementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnhancementError";
  }
}

export interface EnhancementModule {
  /** Root-relative path, always with forward slashes. */
  path: string;
  /** Absolute path on disk. */
  absolute: string;
}

const SPEC_ID = /^[a-z0-9][a-z0-9._-]*$/;

export function resolveSpecId(doc: Record<string, any>, explicit?: string): string {
  const candidate = (explicit ?? doc["x-spec-id"] ?? "").toString().trim();
  if (!candidate) return "";
  if (!SPEC_ID.test(candidate)) {
    throw new EnhancementError(
      "invalid spec id " + JSON.stringify(candidate)
        + "; expected lowercase letters, digits, dots, underscores or hyphens",
    );
  }
  return candidate;
}

function insideRoot(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith(".." + sep) && rel !== ".." && !isAbsolute(rel));
}

function relativePath(root: string, target: string): string {
  return relative(root, target).split(sep).join("/");
}

function collectDirectory(root: string, directory: string, out: EnhancementModule[]): void {
  for (const name of readdirSync(directory).sort()) {
    const absolute = join(directory, name);
    const real = realpathSync(absolute);
    if (!insideRoot(root, real)) {
      throw new EnhancementError(
        "enhancement path escapes the project root: " + relativePath(root, absolute),
      );
    }
    if (statSync(real).isDirectory()) {
      collectDirectory(root, real, out);
      continue;
    }
    if (extname(name) !== ".typ") continue;
    if (name.startsWith("_")) continue;
    out.push({ path: relativePath(root, real), absolute: real });
  }
}

export function discoverEnhancementModules(root: string, explicit?: string): EnhancementModule[] {
  const realRoot = realpathSync(root);
  const defaultDirectory = join(realRoot, "overrides");

  if (explicit) {
    const requested = resolve(process.cwd(), explicit);
    if (!existsSync(requested)) {
      throw new EnhancementError("--overrides path does not exist: " + explicit);
    }
    const real = realpathSync(requested);
    if (!insideRoot(realRoot, real)) {
      throw new EnhancementError("--overrides path must be inside the project root: " + explicit);
    }
    if (statSync(real).isDirectory()) {
      const modules: EnhancementModule[] = [];
      collectDirectory(realRoot, real, modules);
      if (modules.length === 0) {
        throw new EnhancementError("no enhancement modules found in " + explicit);
      }
      return modules;
    }
    if (extname(real) !== ".typ") {
      throw new EnhancementError("--overrides file must be a .typ module: " + explicit);
    }
    if (basename(real).startsWith("_")) {
      throw new EnhancementError("helper modules starting with _ cannot be selected directly: " + explicit);
    }
    return [{ path: relativePath(realRoot, real), absolute: real }];
  }

  if (!existsSync(defaultDirectory)) return [];
  const modules: EnhancementModule[] = [];
  collectDirectory(realRoot, defaultDirectory, modules);
  return modules;
}

export function writeEnhancementBundle(
  root: string,
  modules: EnhancementModule[],
  specId: string,
  show: boolean,
): string {
  const lines: string[] = [];
  modules.forEach((module, index) => {
    const importPath = JSON.stringify("/" + module.path);
    lines.push(
      "#import " + importPath
        + ": meta as enhancement_meta_" + index
        + ", overrides as enhancement_overrides_" + index,
    );
  });
  lines.push("#let enhancement-spec-id = " + encode(specId));
  lines.push("#let show-enhancements = " + (show ? "true" : "false"));
  lines.push("#let enhancement-groups = (");
  modules.forEach((module, index) => {
    lines.push("  (");
    lines.push("    path: " + JSON.stringify(module.path) + ",");
    lines.push("    meta: enhancement_meta_" + index + ",");
    lines.push("    overrides: enhancement_overrides_" + index + ",");
    lines.push("  ),");
  });
  lines.push(")");
  return lines.join("\n") + "\n";
}
