import siteConfig from "../../../config/site.config.ts";

export interface GoogleMapsRatingFields {
  googleMapsRating?: number;
  googleMapsRatingsCount?: number;
}

export function hasGoogleMapsRating(entry: GoogleMapsRatingFields): boolean {
  const rating = entry.googleMapsRating;
  const count = entry.googleMapsRatingsCount;
  return rating !== undefined && count !== undefined && count > 0 && rating >= 1 && rating <= 5;
}

export function shouldEmitAggregateRating(count: number): boolean {
  return count >= siteConfig.quality.aggregateRatingMinCount;
}

export function formatGoogleMapsRating(
  rating: number,
  locale = siteConfig.site.defaultLocale,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}

export function formatGoogleMapsRatingsCount(
  count: number,
  locale = siteConfig.site.defaultLocale,
): string {
  return new Intl.NumberFormat(locale).format(count);
}

export function parseGoogleMapsRatingFields(
  score: string | undefined,
  ratings: string | undefined,
): GoogleMapsRatingFields | undefined {
  const googleMapsRating = Number.parseFloat((score ?? "").trim());
  const googleMapsRatingsCount = Number.parseInt((ratings ?? "").trim(), 10);

  if (
    !Number.isFinite(googleMapsRating) ||
    googleMapsRating < 1 ||
    googleMapsRating > 5 ||
    !Number.isFinite(googleMapsRatingsCount) ||
    googleMapsRatingsCount <= 0
  ) {
    return undefined;
  }

  return { googleMapsRating, googleMapsRatingsCount };
}
