import siteConfig from "../../../../config/site.config.ts";
import { homeUrl } from "../../routing/paths.ts";

export function buildOrganizationJsonLd(): Record<string, unknown> {
  const { operator, site } = siteConfig;

  const organization: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: homeUrl(),
    email: operator.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: operator.street,
      addressLocality: operator.city,
      postalCode: operator.postalCode,
      addressCountry: "DE",
    },
    founder: {
      "@type": "Person",
      name: operator.name,
    },
  };

  if (operator.phone) {
    organization.telephone = operator.phone;
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        name: site.name,
        url: homeUrl(),
        description: site.description,
        inLanguage: site.defaultLocale,
        publisher: {
          "@type": "Organization",
          name: site.name,
          url: homeUrl(),
        },
      },
    ],
  };
}
