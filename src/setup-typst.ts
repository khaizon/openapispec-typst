import { execFileSync } from "node:child_process";
import { copyFileSync, chmodSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * The npm "typst" package bundles Typst 0.10, while the document template
 * targets Typst 0.15. Point its typed API at the official 0.15.1 CLI
 * distributed through @flukxr/typst-cli.
 */
export function ensureTypstBinary(): void {
  const targetPackage = "@typst-community/typst-" + process.platform + "-" + process.arch;
  let target: string;
  try {
    target = require.resolve(targetPackage);
  } catch {
    return;
  }

  let current = "";
  try {
    current = execFileSync(target, ["--version"], { encoding: "utf-8" }).trim();
  } catch {
    current = "";
  }
  if (/typst 0\.15\./.test(current)) return;

  const cli = require("@flukxr/typst-cli") as { typstPath: string; version: string };
  copyFileSync(cli.typstPath, target);
  chmodSync(target, 0o755);
  console.log("==> aligned typst npm API with Typst " + cli.version);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  ensureTypstBinary();
}
