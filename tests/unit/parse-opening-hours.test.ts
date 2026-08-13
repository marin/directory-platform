import { describe, expect, it } from "vitest";
import {
  groupOpeningHoursByDay,
  parseGermanOpeningHours,
} from "../../src/lib/data/parse-opening-hours.ts";

describe("parseGermanOpeningHours", () => {
  it("parses a single daily range", () => {
    expect(
      parseGermanOpeningHours(
        "Montag: 09:00–20:00, Dienstag: 09:00–20:00, Mittwoch: Geschlossen",
      ),
    ).toEqual([
      { day: "Monday", open: "09:00", close: "20:00" },
      { day: "Tuesday", open: "09:00", close: "20:00" },
    ]);
  });

  it("parses split hours as separate ranges", () => {
    expect(
      parseGermanOpeningHours("Montag: 09:00–13:00 / 14:00–18:00"),
    ).toEqual([
      { day: "Monday", open: "09:00", close: "13:00" },
      { day: "Monday", open: "14:00", close: "18:00" },
    ]);
  });

  it("sorts days Monday through Sunday", () => {
    expect(
      parseGermanOpeningHours(
        "Freitag: 09:00–20:00, Montag: 09:00–20:00, Sonntag: Geschlossen",
      ),
    ).toEqual([
      { day: "Monday", open: "09:00", close: "20:00" },
      { day: "Friday", open: "09:00", close: "20:00" },
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseGermanOpeningHours("")).toEqual([]);
    expect(parseGermanOpeningHours(undefined)).toEqual([]);
  });
});

describe("groupOpeningHoursByDay", () => {
  it("groups multiple ranges on the same day", () => {
    expect(
      groupOpeningHoursByDay([
        { day: "Monday", open: "09:00", close: "13:00" },
        { day: "Monday", open: "14:00", close: "18:00" },
      ]),
    ).toEqual([
      {
        day: "Monday",
        ranges: [
          { open: "09:00", close: "13:00" },
          { open: "14:00", close: "18:00" },
        ],
      },
    ]);
  });
});
