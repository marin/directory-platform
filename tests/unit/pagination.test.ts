import { describe, it, expect } from "vitest";
import { pageSlice, totalPages } from "../../src/lib/pagination.ts";

describe("pagination", () => {
  it("computes total pages", () => {
    expect(totalPages(93, 12)).toBe(8);
    expect(totalPages(12, 12)).toBe(1);
    expect(totalPages(0, 12)).toBe(0);
  });

  it("slices items by page", () => {
    const items = Array.from({ length: 15 }, (_, i) => i + 1);
    expect(pageSlice(items, 1, 12)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(pageSlice(items, 2, 12)).toEqual([13, 14, 15]);
  });
});
