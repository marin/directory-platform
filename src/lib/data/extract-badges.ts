import type { Entry } from "../validation/entry-schema.ts";

export type EntryBadgeId = "hpp" | "kinder";

export const ENTRY_BADGE_META: Record<EntryBadgeId, { id: EntryBadgeId; label: string }> = {
  hpp: {
    id: "hpp",
    label: "Heilpraktiker für Psychotherapie",
  },
  kinder: {
    id: "kinder",
    label: "Behandelt Kinder",
  },
};

const HPP_RE =
  /heilpraktiker(?:in)?[\s(]+(?:f(?:ü|ue|u)r\s+)?psychotherapie|psychotherapeutische[rn]?\s+heilpraktiker(?:in)?/i;

const KINDER_SPECIALTY_RE =
  /kinderosteopathie|kinder-osteopathie|kinderheilkunde|kindertherapie|s(?:ä|ae)uglingsosteopathie|kleinkindosteopathie/i;

const KINDER_AUDIENCE_RE =
  /(?:f(?:ü|ue|u)r|behandelt|behandlung(?:en)?|therapie|osteopathie|hom(?:ö|oe)opathie|praxis|spezialisiert(?:e|er|es)?)\s+(?:erwachsene(?:\s*(?:,|&|und)\s*)+)?(?:s(?:ä|ae)uglinge|kinder|babys)(?![a-zäöüß])|(?:s(?:ä|ae)uglinge|kinder|babys)(?![a-zäöüß])\s*(?:,|&|und)\s*(?:kinder\s*(?:,|&|und)\s*)?erwachsene/i;

type BadgeSource = Pick<Entry, "name" | "description" | "offers">;

function sourceText(entry: BadgeSource): string {
  const offerNames = (entry.offers ?? []).map((offer) => offer.name).join(" ");
  return `${entry.name}\n${entry.description}\n${offerNames}`;
}

export function detectsHpp(entry: BadgeSource): boolean {
  return HPP_RE.test(entry.name) || HPP_RE.test(entry.description);
}

export function detectsKinder(entry: BadgeSource): boolean {
  const text = sourceText(entry).replace(/kinderwunsch/gi, " ");
  return KINDER_SPECIALTY_RE.test(text) || KINDER_AUDIENCE_RE.test(text);
}

export function extractEntryBadgeIds(entry: BadgeSource): EntryBadgeId[] {
  const ids: EntryBadgeId[] = [];
  if (detectsHpp(entry)) ids.push("hpp");
  if (detectsKinder(entry)) ids.push("kinder");
  return ids;
}
