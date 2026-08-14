import { describe, it, expect } from "vitest";
import {
  buildGoogleMapsDirectionsUrl,
  buildOpenStreetMapEmbedUrl,
  resolveEntryMapUrls,
} from "../../src/lib/geo/map-urls.ts";

describe("buildOpenStreetMapEmbedUrl", () => {
  it("builds an embed URL with bbox and marker", () => {
    const url = buildOpenStreetMapEmbedUrl(52.52, 13.405);
    expect(url).toContain("openstreetmap.org/export/embed.html");
    expect(url).toContain("marker=52.52%2C13.405");
    expect(url).toContain("bbox=");
  });
});

describe("buildGoogleMapsDirectionsUrl", () => {
  it("prefers place_id from a Google Maps listing URL", () => {
    expect(
      buildGoogleMapsDirectionsUrl({
        googleMapsUrl:
          "https://www.google.de/maps/place/?q=place_id:ChIJQYAMi05FqEcRwhm-z74hols",
        geo: { lat: 52.52, lng: 13.405 },
      }),
    ).toBe(
      "https://www.google.de/maps/dir/?api=1&destination=place_id%3AChIJQYAMi05FqEcRwhm-z74hols",
    );
  });

  it("falls back to coordinates when no place ID is available", () => {
    expect(
      buildGoogleMapsDirectionsUrl({
        geo: { lat: 52.3886709, lng: 13.3946009 },
      }),
    ).toBe(
      "https://www.google.de/maps/dir/?api=1&destination=52.3886709%2C13.3946009",
    );
  });

  it("falls back to formatted address when coordinates are missing", () => {
    expect(
      buildGoogleMapsDirectionsUrl({
        formattedAddress: "Wünsdorfer Str. 107, 12307 Berlin",
      }),
    ).toBe(
      "https://www.google.de/maps/dir/?api=1&destination=W%C3%BCnsdorfer+Str.+107%2C+12307+Berlin",
    );
  });
});

describe("resolveEntryMapUrls", () => {
  it("returns embed, directions, and listing URLs when geo and maps URL exist", () => {
    const urls = resolveEntryMapUrls({
      geo: { lat: 52.52, lng: 13.405 },
      googleMapsUrl:
        "https://www.google.de/maps/place/?q=place_id:ChIJQYAMi05FqEcRwhm-z74hols",
      formattedAddress: "Torstr. 1, 10119 Berlin",
    });

    expect(urls.embedUrl).toContain("openstreetmap.org");
    expect(urls.directionsUrl).toContain("google.de/maps/dir");
    expect(urls.listingUrl).toBe(
      "https://www.google.de/maps/place/?q=place_id:ChIJQYAMi05FqEcRwhm-z74hols",
    );
  });
});
