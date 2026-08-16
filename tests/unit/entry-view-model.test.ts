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

  it("resolves indication tags in taxonomy order", () => {
    const entry = dataset.entries.find(
      (item) => (item.indicationIds ?? []).length >= 1,
    );
    if (!entry) {
      const tagged = toEntryViewModel(
        {
          ...dataset.entries[0]!,
          indicationIds: dataset.indications.slice(0, 2).map((item) => item.id),
        },
        dataset.categories,
        dataset.areas,
        dataset.entries,
        dataset.indications,
      );
      expect(tagged.indications.map((item) => item.id)).toEqual(
        dataset.indications.slice(0, 2).map((item) => item.id),
      );
      return;
    }

    const vm = toEntryViewModel(
      entry,
      dataset.categories,
      dataset.areas,
      dataset.entries,
      dataset.indications,
    );
    expect(vm.indications.map((item) => item.id)).toEqual(entry.indicationIds);
  });

  it("resolves association chips and a credentials line", () => {
    const vod = dataset.associations.find((item) => item.id === "vod");
    expect(vod).toBeDefined();
    const entry = {
      ...dataset.entries[0]!,
      associationIds: ["vod"],
      qualifications: ["Diplom-Physiotherapeutin"],
    };
    const vm = toEntryViewModel(
      entry,
      dataset.categories,
      dataset.areas,
      dataset.entries,
      dataset.indications,
      dataset.associations,
    );
    expect(vm.associations).toEqual([
      { id: "vod", label: "Mitglied im VOD", href: "/verband/vod/" },
    ]);
    expect(vm.credentialsLine).toBe("Diplom-Physiotherapeutin. Mitglied im VOD.");
  });
});
