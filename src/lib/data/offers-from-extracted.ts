import type { ExtractedOffer } from "./extract-prices.ts";
import { isUsableServiceName, type ExtractedService } from "./extract-services.ts";
import { stripHtmlArtifacts } from "./strip-html-artifacts.ts";
import type { Offer } from "../validation/entry-schema.ts";

function parseDurationMinutes(durationLabel?: string): number | undefined {
  if (!durationLabel) return undefined;
  const match = durationLabel.match(/(\d{1,3})\s*min/i);
  if (!match) return undefined;
  const minutes = Number.parseInt(match[1]!, 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : undefined;
}

function normalizeOfferName(name: string): string {
  return name.toLowerCase().trim();
}

export function offersFromExtracted(extracted: ExtractedOffer[]): Offer[] {
  return extracted.map((offer, index) => {
    const durationMinutes = parseDurationMinutes(offer.durationLabel);
    const mapped: Offer = {
      id: `offer-${index + 1}`,
      name: offer.name,
    };
    if (offer.price !== undefined) mapped.price = offer.price;
    if (offer.priceLabel) mapped.priceLabel = offer.priceLabel;
    if (offer.durationLabel) mapped.durationLabel = offer.durationLabel;
    if (durationMinutes !== undefined) mapped.durationMinutes = durationMinutes;
    if (offer.description) mapped.description = offer.description;
    return mapped;
  });
}

export function offersFromServices(services: ExtractedService[]): Offer[] {
  return services.map((service, index) => {
    const mapped: Offer = {
      id: `offer-${index + 1}`,
      name: service.name,
    };
    if (service.description) mapped.description = service.description;
    return mapped;
  });
}

function tidyOfferName(name: string): string {
  return stripHtmlArtifacts(name)
    .replace(/[…]+$/g, "")
    .replace(/[:]+$/g, "")
    .trim();
}

export function filterUsableOffers(offers: Offer[], entryName?: string): Offer[] {
  return offers
    .map((offer) => ({
      ...offer,
      name: tidyOfferName(offer.name),
    }))
    .filter((offer) => isUsableServiceName(offer.name, entryName))
    .map((offer, index) => ({ ...offer, id: `offer-${index + 1}` }));
}

export function mergeServiceOffers(
  existing: Offer[],
  services: ExtractedService[],
  entryName?: string,
): Offer[] {
  const merged = filterUsableOffers(existing, entryName);
  const seen = new Set(merged.map((offer) => normalizeOfferName(offer.name)));

  for (const service of services) {
    const name = tidyOfferName(service.name);
    if (!isUsableServiceName(name, entryName)) continue;
    const key = normalizeOfferName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: `offer-${merged.length + 1}`,
      name,
      ...(service.description ? { description: service.description } : {}),
    });
  }

  return merged.map((offer, index) => ({ ...offer, id: `offer-${index + 1}` }));
}
