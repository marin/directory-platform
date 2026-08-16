import siteConfig from "../../../../config/site.config.ts";
import {
  categoryPath,
  areaPath,
  absoluteUrl,
  homePath,
  homeUrl,
} from "../../routing/paths.ts";
import { buildBreadcrumbList } from "./builders.ts";

/** Übersichtsseiten ohne eigene Route-Helfer — Pfade stehen im Header und Footer genauso. */
export const METHODS_PATH = "/methoden";
export const AREAS_PATH = "/area";

interface HubItem {
  name: string;
  slug: string;
}

function buildHubIndexJsonLd(options: {
  path: string;
  breadcrumbLabel: string;
  title: string;
  description: string;
  hubs: HubItem[];
  hubPath: (slug: string) => string;
  itemType: string;
  faq?: Array<{ question: string; answer: string }>;
}): Record<string, unknown> {
  const { path, breadcrumbLabel, title, description, hubs, hubPath, itemType, faq } = options;
  const url = absoluteUrl(path);

  const breadcrumbs = buildBreadcrumbList([
    { name: "Startseite", path: homePath() },
    { name: breadcrumbLabel, path },
  ]);

  const itemList = {
    "@type": "ItemList",
    "@id": `${url}#list`,
    name: title,
    numberOfItems: hubs.length,
    itemListElement: hubs.map((hub, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(hubPath(hub.slug)),
      name: hub.name,
      item: {
        "@type": itemType,
        name: hub.name,
        url: absoluteUrl(hubPath(hub.slug)),
      },
    })),
  };

  const collectionPage = {
    "@type": "CollectionPage",
    name: title,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.site.name,
      url: homeUrl(),
    },
    mainEntity: { "@id": `${url}#list` },
  };

  const graphs: Record<string, unknown>[] = [breadcrumbs, collectionPage, itemList];

  if (faq && faq.length > 0) {
    graphs.push({
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graphs };
}

/** /methoden — Schwerpunkte als MedicalTherapy. */
export function buildMethodsIndexJsonLd(
  hubs: HubItem[],
  title: string,
  description: string,
  faq: Array<{ question: string; answer: string }> = [],
): Record<string, unknown> {
  return buildHubIndexJsonLd({
    path: METHODS_PATH,
    breadcrumbLabel: "Methoden",
    title,
    description,
    hubs,
    hubPath: categoryPath,
    itemType: "MedicalTherapy",
    faq,
  });
}

/** /area — Bezirke als AdministrativeArea. */
export function buildAreasIndexJsonLd(
  hubs: HubItem[],
  title: string,
  description: string,
  faq: Array<{ question: string; answer: string }> = [],
): Record<string, unknown> {
  return buildHubIndexJsonLd({
    path: AREAS_PATH,
    breadcrumbLabel: "Bezirke",
    title,
    description,
    hubs,
    hubPath: areaPath,
    itemType: "AdministrativeArea",
    faq,
  });
}
