import { loadDataset } from "../lib/data/load-dataset.ts";
import { buildLlmsFullTxt } from "../lib/geo/llms.ts";

export function GET() {
  const dataset = loadDataset();
  return new Response(buildLlmsFullTxt(dataset), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
