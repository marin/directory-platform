import type { z } from "zod";
import type { openingHoursSchema } from "../validation/entry-schema.ts";

type OpeningHour = z.infer<typeof openingHoursSchema>;

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const GERMAN_DAY_TO_ENGLISH: Record<string, (typeof DAY_ORDER)[number]> = {
  Montag: "Monday",
  Dienstag: "Tuesday",
  Mittwoch: "Wednesday",
  Donnerstag: "Thursday",
  Freitag: "Friday",
  Samstag: "Saturday",
  Sonntag: "Sunday",
};

function normalizeTime(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number.parseInt(match[1]!, 10);
  const minute = match[2]!;
  if (hour < 0 || hour > 23) return undefined;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function sortOpeningHours(hours: OpeningHour[]): OpeningHour[] {
  return [...hours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day),
  );
}

export function parseGermanOpeningHours(raw: string | undefined | null): OpeningHour[] {
  const text = raw?.trim();
  if (!text) return [];

  const hours: OpeningHour[] = [];

  for (const segment of text.split(/,\s*/)) {
    const colonIndex = segment.indexOf(":");
    if (colonIndex === -1) continue;

    const dayLabel = segment.slice(0, colonIndex).trim();
    const day = GERMAN_DAY_TO_ENGLISH[dayLabel];
    if (!day) continue;

    const value = segment.slice(colonIndex + 1).trim();
    if (/geschlossen/i.test(value)) continue;

    for (const range of value.split(/\s*\/\s*/)) {
      const match = range.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
      if (!match) continue;

      const open = normalizeTime(match[1]!);
      const close = normalizeTime(match[2]!);
      if (!open || !close) continue;

      hours.push({ day, open, close });
    }
  }

  return sortOpeningHours(hours);
}

export function groupOpeningHoursByDay(
  hours: OpeningHour[],
): Array<{ day: OpeningHour["day"]; ranges: Array<{ open: string; close: string }> }> {
  const grouped = new Map<OpeningHour["day"], Array<{ open: string; close: string }>>();

  for (const hour of sortOpeningHours(hours)) {
    const ranges = grouped.get(hour.day) ?? [];
    ranges.push({ open: hour.open, close: hour.close });
    grouped.set(hour.day, ranges);
  }

  return DAY_ORDER.filter((day) => grouped.has(day)).map((day) => ({
    day,
    ranges: grouped.get(day)!,
  }));
}
