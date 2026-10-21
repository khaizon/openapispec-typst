import { buildDocument } from "../src/build.js";

function arg(name: string, fallback: string | undefined): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const result = await buildDocument({
  spec: arg("--spec", process.env.SPEC),
  name: arg("--name", process.env.NAME),
  mode: arg("--mode", process.env.MODE),
  date: arg("--date", process.env.BUILD_DATE || undefined),
});
console.log(
  "spec: " + result.spec.title + " v" + result.spec.version
    + " (" + result.spec.openapi + ")",
);
