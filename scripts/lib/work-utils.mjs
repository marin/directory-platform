import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../..");
export const WORK = join(ROOT, "work");

export function ensureWorkDir(...parts) {
  const dir = join(WORK, ...parts);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 12);
}

export function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json"));
}
