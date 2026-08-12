import { normalizePhone } from "../../src/lib/data/normalize.ts";

export function normalizeWebsite(url) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

export function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function normalizeAddress(address) {
  if (!address) return "";
  return `${address.street} ${address.locality} ${address.region}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function deduplicateCandidates(candidates, phoneRegion = "US") {
  const results = [];
  const seen = {
    externalId: new Map(),
    website: new Map(),
    phone: new Map(),
    nameAddress: new Map(),
  };

  for (const candidate of candidates) {
    const reasons = [];
    let matchType = "new";

    if (candidate.externalId && seen.externalId.has(candidate.externalId)) {
      matchType = "probable_duplicate";
      reasons.push(`externalId match: ${candidate.externalId}`);
    }
    const website = normalizeWebsite(candidate.website);
    if (website && seen.website.has(website)) {
      matchType = matchType === "new" ? "probable_duplicate" : matchType;
      reasons.push(`website match: ${website}`);
    }
    const phone = normalizePhone(candidate.phone, phoneRegion);
    if (phone && seen.phone.has(phone)) {
      matchType = matchType === "new" ? "probable_duplicate" : matchType;
      reasons.push(`phone match: ${phone}`);
    }
    const nameAddr = `${normalizeName(candidate.name)}|${normalizeAddress(candidate.address)}`;
    if (nameAddr !== "|" && seen.nameAddress.has(nameAddr)) {
      matchType = matchType === "new" ? "possible_update" : matchType;
      reasons.push(`name+address match`);
    }

    if (candidate.externalId) seen.externalId.set(candidate.externalId, candidate);
    if (website) seen.website.set(website, candidate);
    if (phone) seen.phone.set(phone, candidate);
    if (nameAddr !== "|") seen.nameAddress.set(nameAddr, candidate);

    results.push({
      candidate,
      classification: matchType,
      reasons,
      needsReview: matchType !== "new",
    });
  }
  return results;
}
