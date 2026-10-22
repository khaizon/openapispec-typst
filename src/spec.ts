import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

export type Dict = Record<string, any>;

export class SpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpecError";
  }
}

export function loadSpec(path: string): Dict {
  let text: string;
  try {
    text = readFileSync(path, "utf-8");
  } catch (error) {
    throw new SpecError("cannot read spec " + JSON.stringify(path) + ": " + String(error));
  }

  let doc: unknown;
  try {
    doc = parseYaml(text);
  } catch (error) {
    throw new SpecError("invalid YAML in " + JSON.stringify(path) + ": " + String(error));
  }

  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    throw new SpecError(path + ": expected a YAML mapping at the top level");
  }
  const document = doc as Dict;
  const version = String(document.openapi ?? "").trim();
  if (!version) {
    throw new SpecError(path + ": missing required 'openapi' field");
  }
  if (!/^3\.(0|1)\./.test(version)) {
    throw new SpecError(
      path + ": unsupported OpenAPI version " + JSON.stringify(version) + "; this converter targets 3.0.x and 3.1.x",
    );
  }
  if (document.paths === null || typeof document.paths !== "object" || Array.isArray(document.paths)) {
    throw new SpecError(path + ": missing required 'paths' object");
  }
  return document;
}

export function refName(ref: unknown): string {
  if (typeof ref !== "string" || !ref) {
    throw new SpecError("invalid $ref: " + JSON.stringify(ref));
  }
  return ref.replace(/\/+$/, "").split("/").pop()!.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function pointerGet(doc: Dict, pointer: string): any {
  if (typeof pointer !== "string" || !pointer.startsWith("#/")) {
    throw new SpecError("unsupported $ref " + JSON.stringify(pointer) + ": only local references are supported");
  }
  let node: any = doc;
  for (const rawToken of pointer.slice(2).split("/")) {
    const token = rawToken.replace(/~1/g, "/").replace(/~0/g, "~");
    if (node === null || typeof node !== "object" || !(token in node)) {
      throw new SpecError("unresolvable $ref " + JSON.stringify(pointer));
    }
    node = node[token];
  }
  return node;
}

export class Resolver {
  private readonly doc: Dict;
  private readonly cache = new Map<string, any>();

  constructor(doc: Dict) {
    this.doc = doc;
  }

  getRef(ref: string): any {
    if (!this.cache.has(ref)) {
      this.cache.set(ref, pointerGet(this.doc, ref));
    }
    return this.cache.get(ref);
  }

  deref(obj: any): any {
    if (obj === null || typeof obj !== "object" || !("$ref" in obj)) {
      return obj;
    }
    const target = this.getRef(obj.$ref);
    const siblings = Object.fromEntries(
      Object.entries(obj).filter(([key]) => key !== "$ref"),
    );
    if (Object.keys(siblings).length === 0) {
      return target;
    }
    if (target === null || typeof target !== "object" || Array.isArray(target)) {
      throw new SpecError("cannot merge siblings into non-object $ref " + JSON.stringify(obj.$ref));
    }
    return { ...target, ...siblings };
  }

  nameOf(obj: any): string | null {
    if (obj !== null && typeof obj === "object" && "$ref" in obj) {
      return refName(obj.$ref);
    }
    return null;
  }
}

export function validateRefs(doc: Dict): string[] {
  const resolver = new Resolver(doc);
  const problems: string[] = [];

  function visit(node: any, path: string): void {
    if (Array.isArray(node)) {
      node.forEach((value, index) => visit(value, path + "/" + index));
      return;
    }
    if (node === null || typeof node !== "object") {
      return;
    }
    if (typeof node.$ref === "string") {
      try {
        resolver.getRef(node.$ref);
      } catch (error) {
        problems.push(path + ": " + (error instanceof Error ? error.message : String(error)));
      }
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      visit(value, path + "/" + key);
    }
  }

  visit(doc, "#");
  return problems;
}
