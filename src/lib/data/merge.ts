import { hasSubstantiveChange } from "../freshness/substantive-change.ts";
import type { Entry } from "../validation/entry-schema.ts";

export function mergeProposal(
  current: Partial<Entry> | undefined,
  discovered: Partial<Entry>,
  extracted: Partial<Entry>,
): { merged: Partial<Entry>; diff: Array<{ field: string; current?: string; proposed?: string }> } {
  const merged: Partial<Entry> = { ...(current ?? {}) };
  const diff: Array<{ field: string; current?: string; proposed?: string }> = [];
  const sources = [extracted, discovered];

  const fields = new Set([
    ...Object.keys(current ?? {}),
    ...Object.keys(discovered),
    ...Object.keys(extracted),
  ]);

  for (const field of fields) {
    if (field === "id" || field === "slug" || field === "lastUpdated") continue;
    const currentVal = (current as Record<string, unknown>)?.[field];
    const hasCurrent =
      currentVal !== undefined &&
      currentVal !== null &&
      currentVal !== "" &&
      !(Array.isArray(currentVal) && currentVal.length === 0);

    let proposed: unknown;
    for (const src of sources) {
      const val = (src as Record<string, unknown>)[field];
      if (val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)) {
        proposed = val;
        break;
      }
    }

    if (hasCurrent) {
      if (proposed !== undefined && JSON.stringify(currentVal) !== JSON.stringify(proposed)) {
        diff.push({
          field,
          current: JSON.stringify(currentVal),
          proposed: JSON.stringify(proposed),
        });
      }
      continue;
    }

    if (proposed !== undefined) {
      (merged as Record<string, unknown>)[field] = proposed;
    }
  }

  return { merged, diff };
}

export function formatDiff(name: string, diff: ReturnType<typeof mergeProposal>["diff"]): string {
  const lines = [name, ""];
  for (const item of diff) {
    lines.push(item.field);
    lines.push(`  current: ${item.current ?? "(empty)"}`);
    lines.push(`  proposed: ${item.proposed ?? "(empty)"}`);
    lines.push("");
  }
  return lines.join("\n");
}

export { hasSubstantiveChange };
