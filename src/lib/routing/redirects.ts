import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { redirectsFileSchema } from "../validation/redirect-schema.ts";

const ROOT = resolve(import.meta.dirname, "../../..");

export function loadRedirects(): Array<{ from: string; to: string; status?: number }> {
  const path = join(ROOT, "data/redirects.json");
  if (!existsSync(path)) return [];
  return redirectsFileSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
}

export function emitVercelRedirects(
  redirects: Array<{ from: string; to: string; status?: number }>,
): { redirects: Array<{ source: string; destination: string; permanent: boolean }> } {
  return {
    redirects: redirects.map((r) => ({
      source: r.from,
      destination: r.to,
      permanent: (r.status ?? 301) === 301,
    })),
  };
}
