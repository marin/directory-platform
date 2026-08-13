import siteConfig from "../../../config/site.config.ts";

export function formatOperatorAddress(): string {
  const { street, postalCode, city, country } = siteConfig.operator;
  return `${street}, ${postalCode} ${city}, ${country}`;
}

export function formatOperatorAddressLines(): string[] {
  const { street, postalCode, city, country } = siteConfig.operator;
  return [street, `${postalCode} ${city}`, country];
}
