import type { Entry } from "../validation/entry-schema.ts";

const SUBSTANTIVE_FIELDS: Array<keyof Entry> = [
  "name",
  "description",
  "status",
  "categories",
  "areaIds",
  "indicationIds",
  "address",
  "geo",
  "phone",
  "email",
  "website",
  "bookingUrl",
  "openingHours",
  "offers",
  "images",
  "faq",
];

function normalizeForCompare(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    const normalized = value.map(normalizeForCompare).filter((v) => v !== undefined);
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const v = normalizeForCompare(obj[key]);
      if (v !== undefined) result[key] = v;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
  return value;
}

export function hasSubstantiveChange(
  current: Partial<Entry> | undefined,
  proposed: Partial<Entry>,
): boolean {
  if (!current) return true;
  for (const field of SUBSTANTIVE_FIELDS) {
    const a = normalizeForCompare(current[field]);
    const b = normalizeForCompare(proposed[field]);
    if (JSON.stringify(a) !== JSON.stringify(b)) return true;
  }
  return false;
}

export function resolveLastUpdated(
  current: Entry | undefined,
  proposed: Entry,
  substantive: boolean,
): string {
  if (!current) return proposed.lastUpdated;
  if (substantive) return proposed.lastUpdated;
  return current.lastUpdated;
}
