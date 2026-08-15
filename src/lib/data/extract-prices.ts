import { stripHtmlArtifacts } from "./strip-html-artifacts.ts";

export type ExtractedOffer = {
  name: string;
  price?: number;
  priceLabel?: string;
  durationLabel?: string;
  description?: string;
};

const PRICE_RE =
  /(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|EUR|euro|Euro|-\s*€|,\s*€)|(?:€|ab\s*)(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4})\s*,-\s*€/i;
const DURATION_RE = /(\d{1,3})\s*(?:min|Minuten|Min\.?)/i;
const AB_PRICE_RE = /ab\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*€/i;

function parseGermanPrice(raw: string): number | undefined {
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function cleanName(text: string): string {
  return stripHtmlArtifacts(text)
    .replace(/\|/g, " ")
    .replace(/[#>*`\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function extractPriceFromLine(line: string): { price?: number; priceLabel?: string } {
  const ab = line.match(AB_PRICE_RE);
  if (ab) {
    return { price: parseGermanPrice(ab[1]!), priceLabel: `ab ${ab[1]} €` };
  }
  const match = line.match(PRICE_RE);
  if (!match) return {};
  const raw = match[1] ?? match[2] ?? match[3];
  if (!raw) return {};
  const price = parseGermanPrice(raw);
  const priceLabel = match[0].replace(/\s+/g, " ").trim();
  return { price, priceLabel };
}

function nameFromLine(line: string, priceLabel: string): string {
  let name = line.replace(priceLabel, "");
  name = name.replace(/^\s*[-–|:]\s*/, "");
  name = cleanName(name);
  if (name.length >= 3) return name;
  return "";
}

export function extractOffersFromMarkdown(markdown: string): ExtractedOffer[] {
  const offers: ExtractedOffer[] = [];
  const seen = new Set<string>();

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line || !/€|eur|euro|,-/i.test(line)) continue;
    if (/casino|slot|einsatz|gewinn/i.test(line)) continue;

    const { price, priceLabel } = extractPriceFromLine(line);
    if (!price && !priceLabel) continue;

    const duration = line.match(DURATION_RE);
    let name = priceLabel ? nameFromLine(line, priceLabel) : cleanName(line);
    if (!name) {
      const before = line.split(/€|EUR/i)[0] ?? "";
      name = cleanName(before);
    }
    if (!name || name.length < 3) name = "Behandlung";

    const key = `${name}|${price ?? priceLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    offers.push({
      name,
      price,
      priceLabel,
      durationLabel: duration ? `${duration[1]} min` : undefined,
    });
  }

  return offers.slice(0, 30);
}
