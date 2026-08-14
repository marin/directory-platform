/** Extract a Google Place ID from a Maps listing URL (place_id query param). */
export function extractPlaceIdFromGoogleMapsUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;

  const match = trimmed.match(/place_id:([^&]+)/i);
  if (!match?.[1]) return undefined;

  try {
    return decodeURIComponent(match[1]).trim() || undefined;
  } catch {
    return match[1].trim() || undefined;
  }
}

/** Build a Google Maps place listing URL from a Google Place ID (from Lobstr scrapes). */
export function buildGoogleMapsPlaceUrl(placeId: string): string {
  const id = placeId.trim();
  return `https://www.google.de/maps/place/?q=place_id:${encodeURIComponent(id)}`;
}

/** Prefer Place ID; fall back to a scraped maps URL (e.g. cid links). */
export function resolveGoogleMapsUrl(
  placeId: string | undefined,
  scrapedUrl: string | undefined,
): string | undefined {
  const id = placeId?.trim();
  if (id) return buildGoogleMapsPlaceUrl(id);

  const url = scrapedUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return undefined;

  return url.replace(/^https?:\/\/www\.google\.com\/maps/i, "https://www.google.de/maps");
}
