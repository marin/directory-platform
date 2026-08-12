import { loadDataset } from "../lib/data/load-dataset.ts";
import { buildLlmsTxt } from "../lib/geo/llms.ts";

export function GET() {
  const dataset = loadDataset();
  return new Response(buildLlmsTxt(dataset), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
