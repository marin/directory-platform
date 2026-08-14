import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./work-utils.mjs";

function parseEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/** Load `.env` then `.env.local` (later files do not override existing env vars). */
export function loadEnv() {
  parseEnvFile(join(ROOT, ".env"));
  parseEnvFile(join(ROOT, ".env.local"));
}
