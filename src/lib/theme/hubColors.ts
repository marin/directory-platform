/**
 * Farb-Map „Kollage“: slug → feste Füllung + fest hinterlegte Textfarbe.
 * Dieselbe Map versorgt HubTile, ImagePlaceholder und die Methoden-Chips,
 * damit eine Methode überall dieselbe Farbe hat.
 * Textfarbe ist nie berechnet — sie steht hier.
 */

export interface HubColor {
  fill: string;
  ink: string;
}

const PALETTE: HubColor[] = [
  { fill: "#f8e11f", ink: "#241a54" }, // Gelb
  { fill: "#f4a9bf", ink: "#3c2340" }, // Rosé
  { fill: "#1c6b45", ink: "#f0efeb" }, // Grün
  { fill: "#8d84c2", ink: "#f0efeb" }, // Lila
  { fill: "#1f5fae", ink: "#f0efeb" }, // Blau
  { fill: "#ffffff", ink: "#241a54" }, // Weiß
];

const FALLBACK: HubColor = { fill: "#ffffff", ink: "#241a54" };

/** Feste Zuordnung der acht Schwerpunkte — Reihenfolge = Palettenzyklus. */
const HUB_COLORS: Record<string, HubColor> = {
  naturheilkunde: PALETTE[0],
  osteopathie: PALETTE[1],
  homoeopathie: PALETTE[2],
  "akupunktur-tcm": PALETTE[3],
  psychotherapie: PALETTE[4],
  ernaehrungsberatung: PALETTE[5],
  schmerztherapie: PALETTE[0],
  hypnose: PALETTE[1],
};

/** Zeichensumme — deterministisch, gleiches Ergebnis bei jedem Build. */
export function seedSum(seed: string): number {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return sum;
}

export function slugifyDe(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/&/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Bekannter Slug → feste Farbe. Unbekannt → Weiß/Indigo. */
export function hubColor(seed: string | undefined | null): HubColor {
  if (!seed) return FALLBACK;
  return HUB_COLORS[seed] ?? HUB_COLORS[slugifyDe(seed)] ?? FALLBACK;
}

/** Bekannter Slug → feste Farbe. Unbekannt → Palette über Zeichensumme (für Bezirke/Beschwerden). */
export function hubColorCycled(seed: string | undefined | null): HubColor {
  if (!seed) return FALLBACK;
  const known = HUB_COLORS[seed] ?? HUB_COLORS[slugifyDe(seed)];
  if (known) return known;
  return PALETTE[seedSum(seed) % PALETTE.length];
}

function shade(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const num = Number.parseInt(
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value,
    16,
  );
  const channels = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(c * (1 - amount)))),
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Streifenfarben für ImagePlaceholder: Füllung + dieselbe Farbe um 4 % abgedunkelt. */
export function stripeColors(seed: string | undefined | null): { c1: string; c2: string } {
  const base = hubColorCycled(seed).fill;
  const c1 = base.toLowerCase() === "#ffffff" ? "#cfcbe6" : base;
  return { c1, c2: shade(c1, 0.04) };
}
