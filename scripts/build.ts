import { buildDocument } from "../src/build.js";

function arg(name: string, fallback: string | undefined): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function truthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
}

const result = await buildDocument({
  spec: arg("--spec", process.env.SPEC),
  name: arg("--name", process.env.NAME),
  mode: arg("--mode", process.env.MODE),
  date: arg("--date", process.env.BUILD_DATE || undefined),
  overrides: arg("--overrides", process.env.OVERRIDES),
  specId: arg("--spec-id", process.env.SPEC_ID),
  hideEnhancements: hasFlag("--hide-enhancements") || truthy(process.env.HIDE_ENHANCEMENTS),
});
console.log(
  "spec: " + result.spec.title + " v" + result.spec.version
    + " (" + result.spec.openapi + ")",
);
