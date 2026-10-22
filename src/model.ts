import { Resolver, refName, type Dict } from "./spec.js";

const METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const;
const LOCATION_ORDER: Record<string, number> = { path: 0, query: 1, header: 2, cookie: 3 };
const MISSING = Symbol("missing");

export const MODES: Record<string, Dict> = {
  concise: {
    "max-examples": 1,
    "max-error-examples": 5,
    "models-strategy": "compact",
    "inline-request-fields": true,
  },
  reference: {
    "max-examples": 2,
    "max-error-examples": 8,
    "models-strategy": "reference",
    "inline-request-fields": true,
  },
  exhaustive: {
    "max-examples": 99,
    "max-error-examples": 12,
    "models-strategy": "full",
    "inline-request-fields": true,
  },
};

const HTTP_REASONS: Record<string, string> = {
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "204": "No Content",
  "400": "Bad Request",
  "401": "Unauthorized",
  "403": "Forbidden",
  "404": "Not Found",
  "409": "Conflict",
  "422": "Unprocessable Content",
  "429": "Too Many Requests",
  "500": "Internal Server Error",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
};

export function mdText(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function plainText(markdown: string): string {
  const tick = String.fromCharCode(96);
  const fence = tick.repeat(3);
  let text = markdown;
  text = text.replace(new RegExp(fence + "[\\s\\S]*?" + fence, "g"), " ");
  text = text.replace(new RegExp(tick + "([^" + tick + "]*)" + tick, "g"), "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/^[ \t]*[-*+][ \t]+/gm, "");
  text = text.replace(/^#+[ \t]*/gm, "");
  text = text.replace(/\s+/g, " ");
  return text.trim();
}

export function truncate(text: string, limit = 140): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1).trimEnd() + "…";
}

export function jsonPretty(value: any): string {
  return JSON.stringify(value, (_key, item) => (item === undefined ? null : item), 2);
}

// Examples are representative, not exhaustive. Payloads longer than this
// many pretty-printed lines are cut with an explicit marker so the PDF
// renders them as one unbreakable block; full payloads stay in the YAML.
export const EXAMPLE_MAX_LINES = 46;

export function exampleJson(value: any): string {
  const nl = String.fromCharCode(10);
  const text = jsonPretty(value);
  const lines = text.split(nl);
  if (lines.length <= EXAMPLE_MAX_LINES) return text;
  const head = lines.slice(0, EXAMPLE_MAX_LINES).join(nl);
  const note = '... example truncated: first ' + EXAMPLE_MAX_LINES + ' of ' + lines.length + ' lines';
  return head + nl + '"' + note + '"';
}

export function jsonCompact(value: any): string {
  return JSON.stringify(value, (_key, item) => (item === undefined ? null : item));
}

export function displayValue(value: any): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "null";
  return jsonCompact(value);
}

export function statusClass(code: string): string {
  const match = /^([1-5])XX$/.exec(code);
  if (match) return match[1].toLowerCase() + "xx";
  if (/^\d{3}$/.test(code)) return code[0] + "xx";
  return "default";
}

export function statusSortKey(code: string): [number, number, string] {
  if (/^\d+$/.test(code)) return [0, Number(code), ""];
  if (/^[1-5]XX$/.test(code)) return [1, Number(code[0]), code];
  if (code === "default") return [3, 0, code];
  return [2, 0, code];
}

function slugify(value: string, fallback = "item"): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function firstParagraph(text: string): string {
  return text ? text.split(/\n\s*\n/)[0].trim() : "";
}

function representative<T>(items: T[], limit = 3): T[] {
  if (items.length <= limit) return items;
  if (limit <= 1) return items.slice(0, 1);
  const indices = [...new Set(
    Array.from({ length: limit }, (_value, index) =>
      Math.round((index * (items.length - 1)) / (limit - 1)),
    ),
  )].sort((a, b) => a - b);
  return indices.map((index) => items[index]);
}

function showExamples(examples: Dict[], limit = 2): Dict[] {
  if (limit <= 0 || limit >= examples.length) return examples;
  if (limit === 1) return examples.slice(0, 1);
  if (limit === 2) return [examples[0], examples[examples.length - 1]];
  return representative(examples, limit);
}

function uniqueExamples(examples: Dict[]): Dict[] {
  const seen = new Set<string>();
  const result: Dict[] = [];
  for (const example of examples) {
    const key = JSON.stringify([example.name, example["value-json"]]);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(example);
  }
  return result;
}

function schemaKey(value: any): string {
  return JSON.stringify(value);
}

export class Model {
  private readonly doc: Dict;
  private readonly resolver: Resolver;
  private readonly date: string;
  readonly config: Dict;
  private readonly datetimeExamples: string[] = [];

  constructor(doc: Dict, date: string, config: Dict | null = null) {
    this.doc = doc;
    this.resolver = new Resolver(doc);
    this.date = date;
    this.config = { ...MODES.reference };
    if (config) {
      const mode = config.mode;
      if (mode && MODES[mode]) this.config = { ...this.config, ...MODES[mode] };
      this.config = { ...this.config, ...config };
    }
  }

  private defaults(node: Dict): Dict {
    node.kind ??= "any";
    node["type-label"] ??= "any";
    node.description ??= "";
    node["enum-values"] ??= [];
    node.constraints ??= null;
    node["default-text"] ??= null;
    node["example-text"] ??= null;
    node["example-short"] ??= null;
    node.nullable ??= false;
    return node;
  }

  schemaNode(raw: any): Dict {
    if (raw === null || raw === undefined || raw === true) {
      return this.defaults({ kind: "any", "type-label": "any" });
    }
    if (raw === false) return this.defaults({ kind: "any", "type-label": "none" });
    if (typeof raw !== "object" || Array.isArray(raw)) {
      return this.defaults({ kind: "any", "type-label": "any" });
    }
    if ("$ref" in raw) {
      const name = refName(raw.$ref);
      const node: Dict = { kind: "ref", ref: name, "type-label": name };
      const description = mdText(raw.description);
      if (description) node.description = description;
      return this.defaults(node);
    }
    if ("allOf" in raw) return this.defaults(this.objectNode(raw));
    if ("oneOf" in raw) return this.defaults(this.variantsNode(raw, "one-of"));
    if ("anyOf" in raw) return this.defaults(this.variantsNode(raw, "any-of"));

    let rawType = raw.type;
    let nullable = raw.nullable === true;
    if (Array.isArray(rawType)) {
      nullable ||= rawType.includes("null");
      const types = rawType.filter((item: any) => item !== "null").map(String);
      rawType = types.length === 1 ? types[0] : types;
    }
    let node: Dict;
    if (rawType === "array") {
      node = { kind: "array", items: this.schemaNode(raw.items) };
    } else if (rawType === "object" || "properties" in raw || "additionalProperties" in raw) {
      node = this.objectNode(raw);
    } else if (rawType) {
      const types = (Array.isArray(rawType) ? rawType : [rawType]).map(String);
      node = { kind: "primitive", types };
    } else {
      node = { kind: "any", types: [] };
    }
    if (nullable) node.nullable = true;
    return this.defaults(this.finish(node, raw));
  }

  private objectNode(raw: Dict): Dict {
    const properties = new Map<string, any>();
    const required: string[] = [];
    const composition: string[] = [];
    let description = mdText(raw.description);
    let additionalRaw: any = MISSING;

    const absorb = (part: any, seen: Set<string>): void => {
      if (part === null || typeof part !== "object" || Array.isArray(part)) return;
      if ("$ref" in part) {
        const name = refName(part.$ref);
        if (seen.has(name)) return;
        seen.add(name);
        if (!composition.includes(name)) composition.push(name);
        absorb(this.resolver.getRef(part.$ref), seen);
        return;
      }
      if (Array.isArray(part.allOf)) {
        for (const sub of part.allOf) absorb(sub, seen);
      }
      for (const item of part.required ?? []) {
        if (typeof item === "string" && !required.includes(item)) required.push(item);
      }
      if (part.properties && typeof part.properties === "object") {
        for (const [name, value] of Object.entries(part.properties)) properties.set(name, value);
      }
      if (!description) description = mdText(part.description);
      if (additionalRaw === MISSING && "additionalProperties" in part) {
        additionalRaw = part.additionalProperties;
      }
    };
    absorb(raw, new Set());

    const node: Dict = {
      kind: "object",
      properties: [...properties.entries()].map(([name, value]) =>
        this.property(name, value, required.includes(name)),
      ),
      "required-names": required.filter((name) => properties.has(name)),
      "required-count": required.filter((name) => properties.has(name)).length,
      "property-count": properties.size,
      composition,
      merged: composition.length > 0,
      additional:
        typeof additionalRaw === "object" || typeof additionalRaw === "boolean"
          ? this.schemaNode(additionalRaw)
          : null,
    };
    if (description) node.description = description;
    return this.finish(node, raw);
  }

  private property(name: string, raw: any, required: boolean): Dict {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const node = this.schemaNode(source);
    const example = this.firstExample(source);
    let description = mdText(source.description);
    if (!description) description = node.description ?? "";
    return {
      name,
      node,
      required,
      deprecated: Boolean(source.deprecated),
      description,
      "example-text": example,
      "example-short": example ? truncate(example, 100) : null,
      constraints: this.constraints(source),
    };
  }

  private variantsNode(raw: Dict, kind: string): Dict {
    const variants = (raw.oneOf ?? raw.anyOf ?? []).map((variant: any) => this.schemaNode(variant));
    return this.finish(
      { kind, variants, "variant-count": variants.length },
      raw,
    );
  }

  private finish(node: Dict, raw: Dict): Dict {
    let nullable = raw.nullable === true;
    if (Array.isArray(raw.type) && raw.type.includes("null")) nullable = true;
    if (nullable) node.nullable = true;
    const description = mdText(raw.description);
    if (description) node.description = description;
    if (Array.isArray(raw.enum) && raw.enum.length > 0) {
      node["enum-values"] = raw.enum.map((value: any) => displayValue(value));
    }
    if ("default" in raw) node["default-text"] = displayValue(raw.default);
    if (raw.format) node.format = String(raw.format);
    const example = this.firstExample(raw);
    if (example) {
      node["example-text"] = example;
      node["example-short"] = truncate(example, 100);
      if (raw.format === "date-time") this.datetimeExamples.push(example);
    }
    const constraints = this.constraints(raw);
    if (constraints) node.constraints = constraints;
    node["type-label"] = this.typeLabel(node);
    return node;
  }

  private firstExample(raw: Dict): string | null {
    if ("example" in raw) return displayValue(raw.example);
    if (Array.isArray(raw.examples) && raw.examples.length > 0) {
      return displayValue(raw.examples[0]);
    }
    return null;
  }

  private constraints(raw: Dict): string {
    const parts: string[] = [];
    if (raw.pattern) parts.push("pattern: " + String(raw.pattern));
    const labels: Array<[string, string]> = [
      ["minimum", "min"],
      ["maximum", "max"],
      ["exclusiveMinimum", "min >"],
      ["exclusiveMaximum", "max <"],
      ["minLength", "min length"],
      ["maxLength", "max length"],
      ["minItems", "min items"],
      ["maxItems", "max items"],
      ["minProperties", "min properties"],
      ["maxProperties", "max properties"],
    ];
    for (const [key, label] of labels) {
      if (key in raw) parts.push(label + ": " + displayValue(raw[key]));
    }
    if (raw.uniqueItems) parts.push("unique items");
    if (raw.readOnly) parts.push("read-only");
    if (raw.writeOnly) parts.push("write-only");
    return parts.join(" · ");
  }

  private typeLabel(node: Dict): string {
    const kind = node.kind;
    const nullable = node.nullable === true;
    let label: string;
    if (kind === "ref") {
      label = node.ref ?? "";
    } else if (kind === "array") {
      const items = node.items ?? { "type-label": "any" };
      label = "array<" + (items["type-label"] ?? "any") + ">";
    } else if (kind === "one-of") {
      label = "oneOf";
    } else if (kind === "any-of") {
      label = "anyOf";
    } else if (kind === "object") {
      const additional = node.additional;
      if ((node["property-count"] ?? 0) === 0 && additional !== null && additional !== undefined) {
        label = "map<string, " + (additional["type-label"] ?? "any") + ">";
      } else {
        label = "object";
      }
    } else if (kind === "any") {
      label = "any";
    } else {
      const types: string[] = (node.types ?? []).map(String);
      const formatName: string | null = node.format ?? null;
      if (types.length > 0) {
        const primary = types[0];
        const mapped: Record<string, string> = {
          "date-time": "date-time",
          date: "date",
          time: "time",
          uuid: "UUID",
          int32: "int32",
          int64: "int64",
          float: "float",
          double: "double",
          decimal: "decimal",
          binary: "binary",
          byte: "byte",
          email: "email",
          uri: "URI",
          url: "URI",
          password: "password",
        };
        const head = formatName
          ? mapped[formatName] ?? primary + " (" + formatName + ")"
          : primary;
        label = [head, ...types.slice(1)].join(" | ");
      } else {
        label = "any";
      }
    }
    if (nullable && !label.includes("null")) label += " | null";
    return label;
  }

  private examplesFrom(container: any): Dict[] {
    if (container === null || typeof container !== "object") return [];
    const out: Dict[] = [];
    if ("example" in container) {
      out.push(this.exampleEntry("Example", "", container.example));
    }
    const examples = container.examples;
    if (examples && typeof examples === "object" && !Array.isArray(examples)) {
      for (const [name, rawExample] of Object.entries(examples)) {
        const example = this.resolver.deref(rawExample);
        if (!example || typeof example !== "object") continue;
        let value: any;
        if ("value" in example) value = example.value;
        else if ("externalValue" in example) continue;
        else value = example;
        out.push(this.exampleEntry(String(name), mdText(example.summary), value));
      }
    } else if (Array.isArray(examples)) {
      examples.forEach((value, index) =>
        out.push(this.exampleEntry("Example " + (index + 1), "", value)),
      );
    }
    return out;
  }

  private exampleEntry(name: string, summary: string, value: any): Dict {
    return {
      name,
      summary,
      "value-json": exampleJson(value),
      "value-short": truncate(displayValue(value), 90),
    };
  }

  private parameter(raw: any): Dict | null {
    const source = this.resolver.deref(raw);
    if (!source || typeof source !== "object") return null;
    const schema = this.schemaNode(source.schema);
    const examples = this.examplesFrom(source);
    const example = examples.length > 0 ? examples[0]["value-short"] : schema["example-short"] ?? null;
    return {
      name: String(source.name ?? ""),
      location: String(source.in ?? ""),
      required: Boolean(source.required) || source.in === "path",
      deprecated: Boolean(source.deprecated),
      description: mdText(source.description),
      schema,
      "type-label": schema["type-label"] ?? "any",
      "enum-values": schema["enum-values"] ?? [],
      constraints: schema.constraints ?? null,
      "default-text": schema["default-text"] ?? null,
      style: String(source.style ?? ""),
      explode: source.explode ?? null,
      examples,
      "example-short": example,
    };
  }

  private content(content: any): Dict[] {
    const out: Dict[] = [];
    if (!content || typeof content !== "object") return out;
    for (const [mediaType, rawMedia] of Object.entries(content)) {
      const media = this.resolver.deref(rawMedia);
      if (!media || typeof media !== "object") continue;
      const examples = this.examplesFrom(media);
      const schema = this.schemaNode((media as Dict).schema);
      const isVariant = schema.kind === "one-of" || schema.kind === "any-of";
      const shown = isVariant && examples.length <= 4
        ? examples
        : showExamples(examples, Number(this.config["max-examples"] ?? 2));
      out.push({
        "media-type": String(mediaType),
        schema,
        examples,
        "examples-show": shown,
        "examples-total": examples.length,
      });
    }
    return out;
  }

  private responseBody(raw: any): Dict {
    const source = raw && typeof raw === "object" ? raw : {};
    const description = mdText(source.description);
    const headers: Dict[] = [];
    if (source.headers && typeof source.headers === "object") {
      for (const [name, rawHeader] of Object.entries(source.headers)) {
        const header = this.resolver.deref(rawHeader);
        if (header && typeof header === "object") {
          headers.push({
            name: String(name),
            description: mdText((header as Dict).description),
            schema: this.schemaNode((header as Dict).schema),
          });
        }
      }
    }
    const first = firstParagraph(description);
    return {
      description,
      "short-description": truncate(plainText(first), 90),
      content: this.content(source.content),
      headers,
    };
  }

  private response(status: string, raw: any): Dict {
    const shared = this.resolver.nameOf(raw);
    const source = shared ? this.resolver.deref(raw) : raw;
    return {
      status,
      "status-class": statusClass(status),
      shared,
      ...this.responseBody(source),
    };
  }

  private requestBody(raw: any): Dict | null {
    if (raw === null || raw === undefined) return null;
    const source = this.resolver.deref(raw);
    if (!source || typeof source !== "object") return null;
    return {
      required: Boolean(source.required),
      description: mdText(source.description),
      content: this.content(source.content),
    };
  }

  private operation(path: string, method: string, raw: Dict, pathParameters: any[]): Dict {
    const parameters: Dict[] = [];
    for (const rawParameter of [...pathParameters, ...(raw.parameters ?? [])]) {
      const parameter = this.parameter(rawParameter);
      if (parameter) parameters.push(parameter);
    }
    parameters.sort((left, right) => {
      const order = (LOCATION_ORDER[left.location] ?? 9) - (LOCATION_ORDER[right.location] ?? 9);
      return order !== 0 ? order : left.name.localeCompare(right.name);
    });

    const description = mdText(raw.description);
    const blank = description.indexOf("\n\n");
    const purpose = blank >= 0 ? description.slice(0, blank).trim() : description;
    const notes = blank >= 0 ? description.slice(blank + 2).trim() : "";
    let notesFirst = notes;
    let notesRest = "";
    const notesBlank = notes.indexOf("\n\n");
    if (notesBlank >= 0) {
      notesFirst = notes.slice(0, notesBlank).trim();
      notesRest = notes.slice(notesBlank + 2).trim();
    }

    const securityRaw = "security" in raw ? raw.security : this.doc.security;
    const security: string[][] = [];
    if (Array.isArray(securityRaw)) {
      for (const requirement of securityRaw) {
        if (requirement && typeof requirement === "object") {
          security.push(Object.keys(requirement).map(String));
        }
      }
    }
    const tags = (raw.tags ?? []).map(String);
    const external = raw.externalDocs;
    return {
      method: method.toUpperCase(),
      path,
      summary: mdText(raw.summary),
      description,
      purpose,
      notes,
      "notes-first": notesFirst,
      "notes-rest": notesRest,
      tag: tags[0] ?? "Untagged",
      tags,
      "operation-id": mdText(raw.operationId),
      deprecated: Boolean(raw.deprecated),
      security,
      "security-inherited": !("security" in raw),
      "security-exception": false,
      "shared-response-refs": [],
      parameters,
      "request-body": this.requestBody(raw.requestBody),
      responses: Object.entries(raw.responses ?? {})
        .sort(([left], [right]) => {
          const a = statusSortKey(String(left));
          const b = statusSortKey(String(right));
          return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]);
        })
        .map(([status, response]) => this.response(String(status), response)),
      "external-docs": external && typeof external === "object"
        ? { description: mdText(external.description), url: String(external.url ?? "") }
        : null,
    };
  }

  private servers(): Dict[] {
    const servers: Dict[] = [];
    for (const server of this.doc.servers ?? []) {
      if (!server || typeof server !== "object") continue;
      const variables: Dict[] = [];
      if (server.variables && typeof server.variables === "object") {
        for (const [name, variable] of Object.entries(server.variables)) {
          if (!variable || typeof variable !== "object") continue;
          variables.push({
            name: String(name),
            default: displayValue((variable as Dict).default ?? ""),
            description: mdText((variable as Dict).description),
            "enum-values": ((variable as Dict).enum ?? []).map((value: any) => displayValue(value)),
          });
        }
      }
      servers.push({
        url: String(server.url ?? ""),
        description: mdText(server.description),
        variables,
      });
    }
    return servers;
  }

  private securitySchemes(): Dict[] {
    const schemes: Dict[] = [];
    const rawSchemes = this.doc.components?.securitySchemes;
    if (!rawSchemes || typeof rawSchemes !== "object") return schemes;
    for (const [name, raw] of Object.entries(rawSchemes)) {
      if (!raw || typeof raw !== "object") continue;
      const source = raw as Dict;
      const schemeType = String(source.type ?? "");
      const scheme = String(source.scheme ?? "");
      let headerExample = "";
      if (schemeType === "http" && scheme === "basic") {
        headerExample = "Authorization: Basic <base64(clientId:clientSecret)>";
      } else if (schemeType === "http" && scheme === "bearer") {
        headerExample = "Authorization: Bearer <token>";
      } else if (schemeType === "apiKey") {
        headerExample = String(source.name ?? "X-API-Key") + ": <key>";
      } else if (schemeType === "oauth2" || schemeType === "openIdConnect") {
        headerExample = "Authorization: Bearer <access_token>";
      }
      const scopes: string[] = [];
      if (source.flows && typeof source.flows === "object") {
        for (const flow of Object.values(source.flows)) {
          if (!flow || typeof flow !== "object") continue;
          for (const scope of Object.keys((flow as Dict).scopes ?? {})) {
            if (!scopes.includes(scope)) scopes.push(scope);
          }
        }
      }
      if (source.scopes && typeof source.scopes === "object") {
        for (const scope of Object.keys(source.scopes)) {
          if (!scopes.includes(scope)) scopes.push(scope);
        }
      }
      schemes.push({
        name: String(name),
        type: schemeType,
        scheme,
        "bearer-format": String(source.bearerFormat ?? ""),
        location: String(source.in ?? ""),
        "parameter-name": String(source.name ?? ""),
        description: mdText(source.description),
        "openid-url": String(source.openIdConnectUrl ?? ""),
        "header-example": headerExample,
        scopes,
      });
    }
    return schemes;
  }

  private attachRequestModels(operations: Dict[], schemaByName: Map<string, Dict>): void {
    for (const operation of operations) {
      const body = operation["request-body"];
      if (!body) continue;
      for (const entry of body.content) {
        // Always emit the key: templates read content.request-model directly,
        // and a null encodes as Typst none which they already handle with a
        // plain "Schema: <type>" fallback (e.g. array or primitive bodies).
        entry["request-model"] = this.requestModel(entry.schema, schemaByName);
      }
    }
  }

  private requestModel(node: Dict | null, schemaByName: Map<string, Dict>): Dict | null {
    const infoFor = (candidate: any): Dict | null => {
      if (!candidate || typeof candidate !== "object") return null;
      let modelNode = candidate;
      let name = "";
      if (candidate.kind === "ref") {
        name = candidate.ref ?? "";
        const card = schemaByName.get(name);
        if (!card) return null;
        modelNode = card.node;
      }
      if (modelNode.kind !== "object") return null;
      const properties = modelNode.properties ?? [];
      return {
        kind: "object",
        name,
        fields: properties.slice(0, 7),
        "field-count": modelNode["property-count"] ?? properties.length,
        "required-count": modelNode["required-count"] ?? 0,
        truncated: properties.length > 7,
      };
    };

    if (node && (node.kind === "one-of" || node.kind === "any-of")) {
      const variants: Dict[] = [];
      for (const variant of node.variants ?? []) {
        const info = infoFor(variant);
        if (!info) continue;
        info.label = this.variantLabel(info.name);
        info.note = this.variantNote(info);
        variants.push(info);
      }
      if (variants.length === 1) return variants[0];
      if (variants.length > 0) {
        return { kind: "one-of", variants, "variant-count": variants.length };
      }
      return null;
    }
    return infoFor(node);
  }

  private variantLabel(name: string): string {
    for (const suffix of ["Single", "Bulk", "Range", "Multiple"]) {
      if (name.endsWith(suffix)) return suffix;
    }
    return name;
  }

  private variantNote(info: Dict): string {
    const fields = info.fields ?? [];
    const arrayField = fields.find((field: Dict) => field.node?.kind === "array");
    if (arrayField) return "Submit a collection in " + arrayField.name;
    const countField = fields.find((field: Dict) => /(count|quantity|amount)/i.test(field.name));
    if (countField) return "Submit an amount in " + countField.name;
    const rangeField = fields.find((field: Dict) => /(start|end|range)/i.test(field.name));
    if (rangeField) return "Submit a range";
    const required = fields.filter((field: Dict) => field.required).map((field: Dict) => field.name);
    if (required.length > 0) return "Requires " + required.slice(0, 3).join(", ");
    return "Required fields vary";
  }

  private isEnvelope(card: Dict): boolean {
    const node = card.node;
    if (node.kind !== "object") return false;
    const properties = node.properties ?? [];
    if (properties.length < 1 || properties.length > 4) return false;
    const hasRef = properties.some((property: Dict) =>
      ["ref", "array"].includes(property.node?.kind),
    );
    return hasRef && /(Response|Result|Object)$/.test(card.name);
  }

  private collectPropertyRefs(node: Dict | null | undefined, found: Set<string>): void {
    if (!node || typeof node !== "object") return;
    const kind = node.kind;
    if (kind === "ref") {
      if (node.ref) found.add(node.ref);
    } else if (kind === "array") {
      this.collectPropertyRefs(node.items, found);
    } else if (kind === "object") {
      for (const property of node.properties ?? []) {
        this.collectPropertyRefs(property.node, found);
      }
      this.collectPropertyRefs(node.additional, found);
    } else if (kind === "one-of" || kind === "any-of") {
      for (const variant of node.variants ?? []) {
        this.collectPropertyRefs(variant, found);
      }
    }
  }

  private schemaDiff(base: Dict, candidate: Dict): Dict[] | null {
    if (base.node.kind !== "object" || candidate.node.kind !== "object") return null;
    const signature = (card: Dict): Map<string, [string, boolean]> => {
      const result = new Map<string, [string, boolean]>();
      for (const property of card.node.properties ?? []) {
        result.set(property.name, [property.node["type-label"] ?? "any", Boolean(property.required)]);
      }
      return result;
    };
    const baseSig = signature(base);
    const candidateSig = signature(candidate);
    if (baseSig.size === 0) return null;
    const common = [...baseSig.keys()].filter((name) => candidateSig.has(name));
    if (common.length / Math.max(baseSig.size, candidateSig.size) < 0.5) return null;
    const changes: Dict[] = [];
    for (const name of [...baseSig.keys()].sort()) {
      if (!candidateSig.has(name)) {
        changes.push({ field: name, change: "Removed", detail: "" });
        continue;
      }
      const [oldType, oldRequired] = baseSig.get(name)!;
      const [newType, newRequired] = candidateSig.get(name)!;
      if (oldType !== newType) {
        changes.push({ field: name, change: "Type changed", detail: oldType + " → " + newType });
      }
      if (oldRequired !== newRequired) {
        changes.push({
          field: name,
          change: "Required changed",
          detail: oldRequired ? "required → optional" : "optional → required",
        });
      }
    }
    for (const name of [...candidateSig.keys()].filter((name) => !baseSig.has(name)).sort()) {
      changes.push({ field: name, change: "Added", detail: "" });
    }
    if (changes.length > 12) return null;
    return changes;
  }

  private assignModelRoles(schemas: Dict[], operations: Dict[]): void {
    const byName = new Map(schemas.map((card) => [card.name, card]));
    const usage = new Map<string, number>();
    const direct = new Set<string>();

    const bump = (name: string): void => {
      usage.set(name, (usage.get(name) ?? 0) + 1);
    };
    const topRefs = (node: Dict | null | undefined, target: Set<string>): void => {
      if (!node || typeof node !== "object") return;
      const kind = node.kind;
      if (kind === "ref") {
        const name = node.ref ?? "";
        target.add(name);
        bump(name);
      } else if (kind === "array") {
        topRefs(node.items, target);
      } else if (kind === "one-of" || kind === "any-of") {
        for (const variant of node.variants ?? []) topRefs(variant, target);
      }
    };

    for (const operation of operations) {
      const body = operation["request-body"];
      if (body) {
        for (const entry of body.content) topRefs(entry.schema, direct);
      }
      for (const response of operation.responses) {
        for (const entry of response.content) topRefs(entry.schema, direct);
      }
    }

    const publicNames = new Set<string>();
    const queue = [...direct];
    while (queue.length > 0) {
      const name = queue.pop()!;
      if (publicNames.has(name) || !byName.has(name)) continue;
      publicNames.add(name);
      const card = byName.get(name)!;
      if (this.isEnvelope(card)) {
        const refs = new Set<string>();
        this.collectPropertyRefs(card.node, refs);
        for (const ref of refs) {
          if (!publicNames.has(ref)) queue.push(ref);
        }
      }
    }

    for (const card of schemas) {
      const name = card.name;
      if (name.startsWith("V2") && byName.has(name.slice(2))) {
        const base = byName.get(name.slice(2))!;
        const changes = this.schemaDiff(base, card);
        if (changes !== null) {
          card["diff-from"] = base.name;
          card["diff-changes"] = changes;
        }
      }
    }

    for (const card of schemas) {
      if (card["diff-from"]) card.role = "versioned";
      else if (this.isEnvelope(card)) card.role = "envelope";
      else if (card["property-count"] <= 3) card.role = "small";
      else if (publicNames.has(card.name)) card.role = "primary";
      else card.role = "helper";
      card["usage-count"] = usage.get(card.name) ?? 0;
    }

    const order: Record<string, number> = { primary: 0, versioned: 1, envelope: 2, small: 3, helper: 4 };
    schemas.sort((left, right) => {
      const role = order[left.role] - order[right.role];
      if (role !== 0) return role;
      if (left.role === "primary" && left["usage-count"] !== right["usage-count"]) {
        return right["usage-count"] - left["usage-count"];
      }
      return left.name.toLowerCase().localeCompare(right.name.toLowerCase());
    });
  }

  private annotateSecurity(operations: Dict[]): Dict {
    const keys = operations.map((operation) =>
      JSON.stringify(operation.security.map((requirement: string[]) => requirement)),
    );
    const counts = new Map<string, number>();
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    let defaultSecurity: Dict | null = null;
    if (operations.length > 0) {
      const [key, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (count >= 2 && count * 2 >= operations.length) {
        defaultSecurity = {
          requirements: JSON.parse(key),
          count,
          total: operations.length,
        };
      }
    }
    const exceptions: Dict[] = [];
    operations.forEach((operation, index) => {
      const differs = defaultSecurity === null || keys[index] !== JSON.stringify(defaultSecurity.requirements);
      operation["security-exception"] = differs;
      if (differs) {
        exceptions.push({
          heading: operation.heading,
          method: operation.method,
          path: operation.path,
          security: operation.security,
          "operation-id": operation["operation-id"],
        });
      }
    });
    return {
      default: defaultSecurity,
      exceptions,
      schemes: this.securitySchemes(),
    };
  }

  private responseGroups(namedResponses: Dict[]): Dict[] {
    const groups: Dict[] = [];
    const byKey = new Map<string, Dict>();
    for (const response of namedResponses) {
      let label = firstParagraph(response.description) || response.name;
      label = label[0].toUpperCase() + label.slice(1);
      const key = label.toLowerCase();
      let group = byKey.get(key);
      if (!group) {
        group = {
          id: slugify(label, "response"),
          label,
          description: response.description,
          components: [],
          schemas: [],
          examples: [],
          "all-examples": [],
          kind: "other",
        };
        byKey.set(key, group);
        groups.push(group);
      }
      if (!group.components.includes(response.name)) group.components.push(response.name);
      for (const entry of response.content) {
        if (!group.schemas.some((schema: Dict) => schemaKey(schema) === schemaKey(entry.schema))) {
          group.schemas.push(entry.schema);
        }
        for (const example of entry.examples) {
          if (!group["all-examples"].some(
            (existing: Dict) =>
              existing.name === example.name && existing["value-json"] === example["value-json"],
          )) {
            group["all-examples"].push(example);
          }
        }
      }
    }
    for (const group of groups) {
      group.kind = group.label.toLowerCase().includes("error") ? "error" : "success";
      group["examples-total"] = group["all-examples"].length;
      group.examples = representative(group["all-examples"], 3);
    }
    return groups;
  }

  private annotateOperationsResponses(operations: Dict[], groups: Dict[]): void {
    const componentGroup = new Map<string, Dict>();
    for (const group of groups) {
      for (const component of group.components) componentGroup.set(component, group);
    }
    for (const operation of operations) {
      const refs: Dict[] = [];
      const seen = new Set<string>();
      for (const response of operation.responses) {
        const group = componentGroup.get(response.shared);
        if (!group) continue;
        response["group-id"] = group.id;
        response["group-label"] = group.label;
        response["group-kind"] = group.kind;
        if (seen.has(group.id)) continue;
        seen.add(group.id);
        refs.push({
          status: response.status,
          "status-class": response["status-class"],
          label: group.label,
          "group-id": group.id,
          "group-kind": group.kind,
        });
      }
      operation["shared-response-refs"] = refs;
    }
  }

  private errorReference(groups: Dict[], schemas: Dict[], operations: Dict[]): Dict | null {
    const errorGroups = groups.filter((group) => group.kind === "error");
    if (errorGroups.length === 0) return null;
    const schemaByName = new Map(schemas.map((schema) => [schema.name, schema]));
    const names: string[] = [];
    const collect = (node: Dict | null | undefined): void => {
      if (!node || typeof node !== "object") return;
      const kind = node.kind;
      if (kind === "ref") {
        const name = node.ref;
        if (name && !names.includes(name)) {
          names.push(name);
          const card = schemaByName.get(name);
          if (card) collect(card.node);
        }
      } else if (kind === "array") {
        collect(node.items);
      } else if (kind === "object") {
        for (const property of node.properties ?? []) collect(property.node);
      } else if (kind === "one-of" || kind === "any-of") {
        for (const variant of node.variants ?? []) collect(variant);
      }
    };
    for (const group of errorGroups) {
      for (const node of group.schemas) collect(node);
    }
    for (const operation of operations) {
      for (const response of operation.responses) {
        const code = response.status;
        const isError = code === "4XX" || code === "5XX" || (/^\d{3}$/.test(code) && "45".includes(code[0]));
        if (isError) {
          for (const entry of response.content) collect(entry.schema);
        }
      }
    }
    const models = names.map((name) => schemaByName.get(name)).filter(Boolean) as Dict[];
    const modelRank = (card: Dict): number => {
      const name = card.name.toLowerCase();
      if (name.includes("legacy")) return 2;
      if (name.includes("error") && !name.includes("detail")) return 0;
      return 1;
    };
    models.sort((left, right) => modelRank(left) - modelRank(right));
    const envelope = models.length > 0 && modelRank(models[0]) === 0 ? models[0] : null;

    const allExamples = uniqueExamples(
      errorGroups.flatMap((group) => group["all-examples"] as Dict[]),
    );
    const preferred = [
      "badRequest", "missingMandatoryField", "unauthorized", "forbidden",
      "resourceNotFound", "conflict", "invalidInput", "tooManyRequests",
      "serverError", "gatewayTimeout",
    ];
    const byName = new Map(allExamples.map((example) => [example.name, example]));
    const selected: Dict[] = [];
    for (const name of preferred) {
      const example = byName.get(name);
      if (example && !selected.includes(example)) selected.push(example);
    }
    const limit = Number(this.config["max-error-examples"] ?? 8);
    for (const example of allExamples) {
      if (selected.length >= limit) break;
      if (!selected.includes(example)) selected.push(example);
    }
    selected.splice(limit);

    const statuses = new Map<string, string>();
    const addStatus = (code: string, meaning: string): void => {
      const value = String(code);
      if (!value) return;
      if (!statuses.has(value) || (!statuses.get(value) && meaning)) {
        statuses.set(value, meaning.trim());
      }
    };
    for (const example of allExamples) {
      const match = /\((\d{3})\)/.exec(example.summary ?? "");
      if (match) {
        addStatus(match[1], (example.summary ?? "").replace(/\s*\(\d{3}\)\s*$/, "").trim());
      }
    }
    for (const operation of operations) {
      for (const response of operation.responses) {
        const code = response.status;
        if (/^\d+$/.test(code)) {
          addStatus(code, firstParagraph(response["short-description"] ?? response.description ?? ""));
        } else if (/^[45]XX$/.test(code)) {
          const kind = code.startsWith("4") ? "client" : "server";
          const label = response["group-label"] ?? (kind[0].toUpperCase() + kind.slice(1) + " error");
          addStatus(code, "Any " + code[0] + "xx " + kind + " error — " + label);
        }
      }
    }
    const ordered = [...statuses.keys()].filter((code) => /^\d+$/.test(code)).sort((a, b) => Number(a) - Number(b));
    const wildcard = [...statuses.keys()].filter((code) => !/^\d+$/.test(code)).sort();
    const statusList = [...ordered, ...wildcard].map((code) => {
      let meaning = statuses.get(code) ?? "";
      if (HTTP_REASONS[code]) meaning = HTTP_REASONS[code];
      else if (code.endsWith("XX")) {
        meaning = "Any " + code[0] + "xx " + (code[0] === "4" ? "client" : "server") + " error";
      }
      return { code, meaning };
    });
    const legacy = models.some((model) => model.name.toLowerCase().includes("legacy"));
    let note = "";
    if (envelope && legacy) {
      note = "Error payloads are not uniform. Most endpoints return the standard object envelope below; the login endpoint returns a legacy array of error items.";
    }
    return {
      models,
      envelope,
      examples: selected,
      "examples-total": allExamples.length,
      statuses: statusList,
      legacy,
      note,
    };
  }

  private conventions(operations: Dict[], schemas: Dict[]): Dict {
    const media = new Map<string, number>();
    const parameters = new Map<string, Dict>();
    for (const operation of operations) {
      for (const parameter of operation.parameters) {
        if (!parameters.has(parameter.name)) parameters.set(parameter.name, parameter);
      }
      const body = operation["request-body"];
      if (body) {
        for (const entry of body.content) {
          media.set(entry["media-type"], (media.get(entry["media-type"]) ?? 0) + 1);
        }
      }
      for (const response of operation.responses) {
        for (const entry of response.content) {
          media.set(entry["media-type"], (media.get(entry["media-type"]) ?? 0) + 1);
        }
      }
    }
    const group = (names: string[]): Dict[] =>
      names.map((name) => parameters.get(name)).filter(Boolean) as Dict[];
    const paginationModel = schemas.find((schema) => schema.name.toLowerCase() === "pagination");
    return {
      "media-types": [...media.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([mediaType, count]) => ({ "media-type": mediaType, count })),
      pagination: {
        parameters: group(["pageNo", "pageSize"]),
        "model-name": paginationModel ? paginationModel.name : "",
      },
      sorting: { parameters: group(["sortBy", "sortOrder"]) },
      filtering: { parameters: group(["filter"]) },
      headers: [...parameters.values()].filter((parameter) => parameter.location === "header"),
      "datetime-example": this.datetimeExamples[0] ?? null,
    };
  }

  private enumReference(operations: Dict[], schemas: Dict[]): Dict[] {
    const entries = new Map<string, Dict>();
    const add = (name: string, values: string[], source: string): void => {
      const key = JSON.stringify([name, [...values].sort()]);
      let entry = entries.get(key);
      if (!entry) {
        entry = { name, values: [...values], "used-in": [source] };
        entries.set(key, entry);
      } else if (!entry["used-in"].includes(source)) {
        entry["used-in"].push(source);
      }
    };
    const walk = (node: Dict | null | undefined, source: string): void => {
      if (!node || typeof node !== "object") return;
      const kind = node.kind;
      if (kind === "object") {
        for (const property of node.properties ?? []) {
          const child = property.node ?? {};
          if (child["enum-values"]?.length) add(property.name, child["enum-values"], source);
          walk(child, source);
        }
      } else if (kind === "array") {
        walk(node.items, source);
      } else if (kind === "one-of" || kind === "any-of") {
        for (const variant of node.variants ?? []) walk(variant, source);
      }
    };
    for (const schema of schemas) {
      walk(schema.node, schema.name);
      if (schema.node["enum-values"]?.length) {
        add(schema.name, schema.node["enum-values"], schema.name);
      }
    }
    for (const operation of operations) {
      for (const parameter of operation.parameters) {
        if (parameter["enum-values"]?.length) {
          add(parameter.name, parameter["enum-values"], "Request parameters");
        }
      }
    }
    const result = [...entries.values()];
    result.sort((left, right) => {
      const name = left.name.toLowerCase().localeCompare(right.name.toLowerCase());
      return name !== 0 ? name : JSON.stringify(left.values).localeCompare(JSON.stringify(right.values));
    });
    return result;
  }

  private specificationNotes(operations: Dict[], tags: Dict[], errorReference: Dict | null, schemas: Dict[]): string[] {
    const notes: string[] = [];
    const wildcard = [...new Set(
      operations.flatMap((operation) =>
        operation.responses
          .map((response: Dict) => response.status)
          .filter((code: string) => /^[45]XX$/.test(code)),
      ),
    )].sort();
    if (wildcard.length > 0) {
      notes.push("Responses " + wildcard.join(" and ") + " are documented as HTTP status-class ranges, not individual status codes.");
    }

    const declared = new Set(
      (this.doc.tags ?? [])
        .filter((tag: any) => tag && typeof tag === "object" && tag.name)
        .map((tag: Dict) => String(tag.name)),
    );
    const used = new Set(operations.map((operation) => operation.tag));
    const missing = [...used].filter((name) => !declared.has(name)).sort();
    if (missing.length > 0) {
      const quoted = missing.map((name) => "'" + name + "'").join(", ");
      notes.push(
        "The tag" + (missing.length > 1 ? "s " : " ") + quoted
        + " is used by operations but not declared in the top-level tags list; "
        + "it is documented as its own section here.",
      );
    }

    const summaryCounts = new Map<string, number>();
    for (const operation of operations) {
      if (operation.summary) {
        summaryCounts.set(operation.summary, (summaryCounts.get(operation.summary) ?? 0) + 1);
      }
    }
    const duplicates = [...summaryCounts.entries()]
      .filter(([name, count]) => name && count > 1)
      .map(([name]) => name)
      .sort();
    if (duplicates.length > 0) {
      notes.push(
        "Duplicate operation summaries ("
        + duplicates.map((name) => "'" + name + "'").join(", ")
        + ") are disambiguated with the API version in the endpoint headings.",
      );
    }

    for (const operation of operations) {
      for (const response of operation.responses) {
        if (response.status === "204" && response.description.toLowerCase().includes("created")) {
          notes.push(
            'Potential specification inconsistency: response 204 is described as "'
            + firstParagraph(response.description) + '".',
          );
        }
      }
    }

    const optionalNotes: string[] = [];
    const walk = (node: Dict | null | undefined, source: string): void => {
      if (!node || typeof node !== "object") return;
      const kind = node.kind;
      if (kind === "object") {
        for (const property of node.properties ?? []) {
          const description = String(property.description ?? "").toLowerCase();
          if (property.required && description.includes("optional")) {
            optionalNotes.push(
              "field " + property.name + " in " + source
              + " is required but its description says optional",
            );
          }
          walk(property.node, source);
        }
      } else if (kind === "array") {
        walk(node.items, source);
      } else if (kind === "one-of" || kind === "any-of") {
        for (const variant of node.variants ?? []) walk(variant, source);
      }
    };
    for (const schema of schemas) walk(schema.node, schema.name);
    for (const note of optionalNotes.slice(0, 3)) {
      notes.push("Potential specification inconsistency: " + note + ".");
    }

    const missingRequired: string[] = [];
    const componentSchemas = this.doc.components?.schemas ?? {};
    for (const [name, raw] of Object.entries(componentSchemas)) {
      if (!raw || typeof raw !== "object" || "allOf" in (raw as Dict)) continue;
      const properties = new Set(Object.keys((raw as Dict).properties ?? {}));
      for (const required of (raw as Dict).required ?? []) {
        if (!properties.has(required)) missingRequired.push(name + "." + required);
      }
    }
    for (const item of missingRequired.slice(0, 3)) {
      notes.push(
        "Potential specification inconsistency: required field " + item
        + " is not declared as a property.",
      );
    }
    return notes;
  }

  build(): Dict {
    const info = this.doc.info ?? {};
    const contact = info.contact && typeof info.contact === "object" ? info.contact : null;
    const license = info.license && typeof info.license === "object" ? info.license : null;

    const operations: Dict[] = [];
    for (const [path, pathItem] of Object.entries(this.doc.paths ?? {})) {
      if (!pathItem || typeof pathItem !== "object") continue;
      const pathParameters = (pathItem as Dict).parameters ?? [];
      for (const method of METHODS) {
        const raw = (pathItem as Dict)[method];
        if (raw && typeof raw === "object") {
          operations.push(this.operation(path, method, raw, pathParameters));
        }
      }
    }

    const summaryCounts = new Map<string, number>();
    for (const operation of operations) {
      const key = operation.summary || operation["operation-id"];
      summaryCounts.set(key, (summaryCounts.get(key) ?? 0) + 1);
    }
    for (const operation of operations) {
      const base = operation.summary || operation["operation-id"] || (operation.method + " " + operation.path);
      let heading = base;
      const key = operation.summary || operation["operation-id"];
      if ((summaryCounts.get(key) ?? 0) > 1) {
        const match = /\/v(\d+(?:\.\d+)?)(?:\/|$)/.exec(operation.path);
        heading = match ? base + " (v" + match[1] + ")" : base + " (" + operation.method + ")";
      }
      operation.heading = heading;
    }

    const authentication = this.annotateSecurity(operations);

    const usedTags = new Map<string, number>();
    for (const operation of operations) {
      usedTags.set(operation.tag, (usedTags.get(operation.tag) ?? 0) + 1);
    }
    const declaredTags = new Map<string, Dict>();
    for (const tag of this.doc.tags ?? []) {
      if (tag && typeof tag === "object" && tag.name) declaredTags.set(String(tag.name), tag);
    }
    const tags: Dict[] = [];
    for (const [name, tag] of declaredTags) {
      if (usedTags.has(name)) {
        tags.push({
          name,
          description: mdText(tag.description),
          "operation-count": usedTags.get(name)!,
        });
      }
    }
    for (const [name, count] of usedTags) {
      if (!declaredTags.has(name)) tags.push({ name, description: "", "operation-count": count });
    }

    const components = this.doc.components ?? {};
    const schemas: Dict[] = [];
    for (const [name, raw] of Object.entries(components.schemas ?? {})) {
      if (!raw || typeof raw !== "object") continue;
      const node = this.schemaNode(raw);
      schemas.push({
        name: String(name),
        node,
        description: mdText((raw as Dict).description) || node.description || "",
        "type-label": node["type-label"] ?? "any",
        "property-count": node["property-count"] ?? 0,
        "required-count": node["required-count"] ?? 0,
        composition: node.composition ?? [],
      });
    }

    const schemaByName = new Map(schemas.map((schema) => [schema.name, schema]));
    this.attachRequestModels(operations, schemaByName);
    this.assignModelRoles(schemas, operations);

    const namedResponses: Dict[] = [];
    for (const [name, raw] of Object.entries(components.responses ?? {})) {
      namedResponses.push({ name: String(name), ...this.responseBody(raw) });
    }

    const namedParameters: Dict[] = [];
    for (const [name, raw] of Object.entries(components.parameters ?? {})) {
      const parameter = this.parameter(raw);
      if (parameter) {
        parameter["component-name"] = String(name);
        namedParameters.push(parameter);
      }
    }

    const responseGroups = this.responseGroups(namedResponses);
    this.annotateOperationsResponses(operations, responseGroups);
    const errorReference = this.errorReference(responseGroups, schemas, operations);
    const errorSchemaNames = new Set((errorReference?.models ?? []).map((card: Dict) => card.name));
    const dataModels = schemas.filter((schema) => !errorSchemaNames.has(schema.name));
    const conventions = this.conventions(operations, schemas);
    const enumReference = this.enumReference(operations, schemas);
    const specificationNotes = this.specificationNotes(operations, tags, errorReference, schemas);
    for (const group of responseGroups) delete group["all-examples"];

    const stats = {
      paths: Object.keys(this.doc.paths ?? {}).length,
      operations: operations.length,
      tags: tags.length,
      schemas: schemas.length,
      "named-responses": namedResponses.length,
      "named-parameters": namedParameters.length,
    };

    return {
      openapi: String(this.doc.openapi ?? ""),
      title: mdText(info.title),
      version: mdText(info.version),
      description: mdText(info.description),
      "terms-of-service": mdText(info.termsOfService),
      contact: contact
        ? { name: mdText(contact.name), email: mdText(contact.email), url: mdText(contact.url) }
        : null,
      license: license
        ? { name: mdText(license.name), identifier: mdText(license.identifier), url: mdText(license.url) }
        : null,
      servers: this.servers(),
      tags,
      "security-schemes": this.securitySchemes(),
      authentication,
      operations,
      schemas,
      "data-models": dataModels,
      "named-responses": namedResponses,
      "named-parameters": namedParameters,
      "response-groups": responseGroups,
      "error-reference": errorReference,
      conventions,
      "enum-reference": enumReference,
      "specification-notes": specificationNotes,
      config: this.config,
      stats,
      generated: { date: this.date, tool: "openapispec-typst 1.0.0" },
    };
  }
}

export function buildModel(doc: Dict, date: string, config: Dict | null = null): Dict {
  return new Model(doc, date, config).build();
}
