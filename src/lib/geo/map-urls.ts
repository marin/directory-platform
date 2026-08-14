import {
  extractPlaceIdFromGoogleMapsUrl,
  resolveGoogleMapsUrl,
} from "./google-maps.ts";

export type MapDestination = {
  geo?: { lat: number; lng: number };
  googleMapsUrl?: string;
  formattedAddress?: string;
};

/** OpenStreetMap embed — no API key required. */
export function buildOpenStreetMapEmbedUrl(
  lat: number,
  lng: number,
  delta = 0.008,
): string {
  const bbox = [
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta,
  ].join(",");
  const params = new URLSearchParams({
    bbox,
    layer: "mapnik",
    marker: `${lat},${lng}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

/** Google Maps directions URL (Anfahrt). Prefers Place ID, then coordinates, then address. */
export function buildGoogleMapsDirectionsUrl(destination: MapDestination): string | undefined {
  const placeId = extractPlaceIdFromGoogleMapsUrl(destination.googleMapsUrl);
  const params = new URLSearchParams({ api: "1" });

  if (placeId) {
    params.set("destination", `place_id:${placeId}`);
  } else if (destination.geo) {
    params.set("destination", `${destination.geo.lat},${destination.geo.lng}`);
  } else if (destination.formattedAddress?.trim()) {
    params.set("destination", destination.formattedAddress.trim());
  } else {
    return undefined;
  }

  return `https://www.google.de/maps/dir/?${params.toString()}`;
}

export function resolveEntryMapUrls(destination: MapDestination): {
  embedUrl?: string;
  directionsUrl?: string;
  listingUrl?: string;
} {
  const placeId = extractPlaceIdFromGoogleMapsUrl(destination.googleMapsUrl);
  const listingUrl = resolveGoogleMapsUrl(placeId, destination.googleMapsUrl);
  const directionsUrl = buildGoogleMapsDirectionsUrl(destination);
  const embedUrl =
    destination.geo
      ? buildOpenStreetMapEmbedUrl(destination.geo.lat, destination.geo.lng)
      : undefined;

  return { embedUrl, directionsUrl, listingUrl };
}
