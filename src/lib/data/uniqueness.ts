function shingles(text: string, size = 3): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const result = new Set<string>();
  for (let i = 0; i <= words.length - size; i++) {
    result.add(words.slice(i, i + size).join(" "));
  }
  return result;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function findSimilarPairs(
  texts: Array<{ id: string; text: string }>,
  threshold: number,
): Array<{ a: string; b: string; similarity: number }> {
  const pairs: Array<{ a: string; b: string; similarity: number }> = [];
  for (let i = 0; i < texts.length; i++) {
    const shinglesA = shingles(texts[i]!.text);
    for (let j = i + 1; j < texts.length; j++) {
      const sim = jaccard(shinglesA, shingles(texts[j]!.text));
      if (sim >= threshold) {
        pairs.push({ a: texts[i]!.id, b: texts[j]!.id, similarity: sim });
      }
    }
  }
  return pairs;
}
