import { describe, it, expect } from "vitest";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import { toEntryViewModel } from "../../src/lib/data/view-models/entry.ts";

describe("toEntryViewModel", () => {
  const dataset = loadDataset();

  it("resolves all entry categories in order", () => {
    const entry = dataset.entries.find((e) => e.categories.length >= 2);
    expect(entry).toBeDefined();

    const vm = toEntryViewModel(entry!, dataset.categories, dataset.areas, dataset.entries);

    expect(vm.categories).toHaveLength(entry!.categories.length);
    expect(vm.categories.map((c) => c.id)).toEqual(entry!.categories);
    expect(vm.category).toBe(vm.categories[0]);
  });
});
