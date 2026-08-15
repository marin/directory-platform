import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import siteConfig from "../../../config/site.config.ts";
import { siteConfigSchema } from "../validation/site-schema.ts";
import { entrySchema } from "../validation/entry-schema.ts";
import { categoriesFileSchema } from "../validation/category-schema.ts";
import { areasFileSchema } from "../validation/area-schema.ts";
import { indicationsFileSchema } from "../validation/indication-schema.ts";
import { associationsFileSchema } from "../validation/association-schema.ts";
import { redirectsFileSchema } from "../validation/redirect-schema.ts";
import { commercialCampaignsFileSchema } from "../validation/campaign-schema.ts";
import { generatedIntroSchema, generatedFaqSchema } from "../validation/generated-schema.ts";
import { reviewsFileSchema } from "../validation/review-schema.ts";
import {
  formatValidationIssues,
  zodIssuesToValidationIssues,
  type ValidationIssue,
} from "../validation/errors.ts";
import { normalizeEntry, type NormalizedEntry } from "./normalize-entry.ts";
import type { Category } from "../validation/category-schema.ts";
import type { Area } from "../validation/area-schema.ts";
import type { Indication } from "../validation/indication-schema.ts";
import type { Association } from "../validation/association-schema.ts";
import type { Redirect } from "../validation/redirect-schema.ts";
import type { CommercialCampaign } from "../validation/campaign-schema.ts";
import type { GeneratedIntro, GeneratedFaq } from "../validation/generated-schema.ts";
import type { Review } from "../validation/review-schema.ts";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

export function getRootDir(): string {
  return ROOT;
}

function readJsonFile<T>(relativePath: string): T {
  const fullPath = join(ROOT, relativePath);
  const content = readFileSync(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

function readJsonDir<T>(relativeDir: string, schema: {
  parse: (data: unknown) => T;
}): Array<{ file: string; data: T }> {
  const dir = join(ROOT, relativeDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const content = readFileSync(join(dir, file), "utf-8");
      return { file: `${relativeDir}/${file}`, data: schema.parse(JSON.parse(content)) };
    });
}

export interface Dataset {
  siteConfig: typeof siteConfig;
  categories: Category[];
  areas: Area[];
  indications: Indication[];
  associations: Association[];
  entries: NormalizedEntry[];
  redirects: Redirect[];
  campaigns: CommercialCampaign[];
  categoryIntros: Map<string, GeneratedIntro>;
  areaIntros: Map<string, GeneratedIntro>;
  indicationIntros: Map<string, GeneratedIntro>;
  associationIntros: Map<string, GeneratedIntro>;
  categoryFaqs: Map<string, GeneratedFaq>;
  areaFaqs: Map<string, GeneratedFaq>;
  indicationFaqs: Map<string, GeneratedFaq>;
  associationFaqs: Map<string, GeneratedFaq>;
  reviews: Map<string, Review[]>;
}

export function loadDataset(): Dataset {
  const categories = categoriesFileSchema.parse(readJsonFile("data/categories.json"));
  const areas = areasFileSchema.parse(readJsonFile("data/areas.json"));
  const indications = indicationsFileSchema.parse(readJsonFile("data/indications.json"));
  const associations = associationsFileSchema.parse(readJsonFile("data/associations.json"));
  const entryFiles = readdirSync(join(ROOT, "data/entries")).filter((f) =>
    f.endsWith(".json"),
  );
  const entries = entryFiles.map((file) => {
    const raw = entrySchema.parse(readJsonFile(`data/entries/${file}`));
    return normalizeEntry(raw);
  });
  const redirects = redirectsFileSchema.parse(
    existsSync(join(ROOT, "data/redirects.json"))
      ? readJsonFile("data/redirects.json")
      : [],
  );
  const campaigns = existsSync(join(ROOT, "data/commercial-campaigns.json"))
    ? commercialCampaignsFileSchema.parse(readJsonFile("data/commercial-campaigns.json"))
    : [];

  const categoryIntros = new Map<string, GeneratedIntro>();
  for (const { data } of readJsonDir("data/generated/category-intros", generatedIntroSchema)) {
    categoryIntros.set(data.id, data);
  }
  const areaIntros = new Map<string, GeneratedIntro>();
  for (const { data } of readJsonDir("data/generated/area-intros", generatedIntroSchema)) {
    areaIntros.set(data.id, data);
  }
  const categoryFaqs = new Map<string, GeneratedFaq>();
  for (const { data } of readJsonDir("data/generated/category-faqs", generatedFaqSchema)) {
    categoryFaqs.set(data.id, data);
  }
  const areaFaqs = new Map<string, GeneratedFaq>();
  for (const { data } of readJsonDir("data/generated/area-faqs", generatedFaqSchema)) {
    areaFaqs.set(data.id, data);
  }
  const indicationIntros = new Map<string, GeneratedIntro>();
  for (const { data } of readJsonDir("data/generated/indication-intros", generatedIntroSchema)) {
    indicationIntros.set(data.id, data);
  }
  const indicationFaqs = new Map<string, GeneratedFaq>();
  for (const { data } of readJsonDir("data/generated/indication-faqs", generatedFaqSchema)) {
    indicationFaqs.set(data.id, data);
  }
  const associationIntros = new Map<string, GeneratedIntro>();
  for (const { data } of readJsonDir("data/generated/association-intros", generatedIntroSchema)) {
    associationIntros.set(data.id, data);
  }
  const associationFaqs = new Map<string, GeneratedFaq>();
  for (const { data } of readJsonDir("data/generated/association-faqs", generatedFaqSchema)) {
    associationFaqs.set(data.id, data);
  }

  const reviews = new Map<string, Review[]>();
  const reviewsDir = join(ROOT, "data/reviews");
  if (existsSync(reviewsDir)) {
    for (const file of readdirSync(reviewsDir).filter((f) => f.endsWith(".json"))) {
      const slug = file.replace(/\.json$/, "");
      reviews.set(slug, reviewsFileSchema.parse(readJsonFile(`data/reviews/${file}`)));
    }
  }

  return {
    siteConfig,
    categories,
    areas,
    indications,
    associations,
    entries,
    redirects,
    campaigns,
    categoryIntros,
    areaIntros,
    indicationIntros,
    associationIntros,
    categoryFaqs,
    areaFaqs,
    indicationFaqs,
    associationFaqs,
    reviews,
  };
}

export function validateDataset(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const siteResult = siteConfigSchema.safeParse(siteConfig);
  if (!siteResult.success) {
    issues.push(...zodIssuesToValidationIssues("config/site.config.ts", siteResult.error));
  }

  let categories: Category[] = [];
  try {
    categories = categoriesFileSchema.parse(readJsonFile("data/categories.json"));
  } catch (e) {
    issues.push({ file: "data/categories.json", field: "(root)", message: String(e) });
  }

  let areas: Area[] = [];
  try {
    areas = areasFileSchema.parse(readJsonFile("data/areas.json"));
  } catch (e) {
    issues.push({ file: "data/areas.json", field: "(root)", message: String(e) });
  }

  let indications: Indication[] = [];
  try {
    indications = indicationsFileSchema.parse(readJsonFile("data/indications.json"));
  } catch (e) {
    issues.push({ file: "data/indications.json", field: "(root)", message: String(e) });
  }

  let associations: Association[] = [];
  try {
    associations = associationsFileSchema.parse(readJsonFile("data/associations.json"));
  } catch (e) {
    issues.push({ file: "data/associations.json", field: "(root)", message: String(e) });
  }

  const categoryIds = new Set(categories.map((c) => c.id));
  const areaIds = new Set(areas.map((a) => a.id));
  const indicationIds = new Set(indications.map((item) => item.id));
  const associationIds = new Set(associations.map((item) => item.id));
  const entrySlugs = new Set<string>();
  const entryIds = new Set<string>();

  const entryDir = join(ROOT, "data/entries");
  if (existsSync(entryDir)) {
    for (const file of readdirSync(entryDir).filter((f) => f.endsWith(".json"))) {
      const filePath = `data/entries/${file}`;
      const result = entrySchema.safeParse(readJsonFile(filePath));
      if (!result.success) {
        issues.push(...zodIssuesToValidationIssues(filePath, result.error));
        continue;
      }
      const entry = result.data;
      if (entryIds.has(entry.id)) {
        issues.push({ file: filePath, field: "id", message: `duplicate id "${entry.id}"` });
      }
      entryIds.add(entry.id);
      if (entrySlugs.has(entry.slug)) {
        issues.push({ file: filePath, field: "slug", message: `duplicate slug "${entry.slug}"` });
      }
      entrySlugs.add(entry.slug);
      if (file !== `${entry.slug}.json`) {
        issues.push({
          file: filePath,
          field: "slug",
          message: `filename must match slug (${entry.slug}.json)`,
        });
      }
      for (const [i, catId] of entry.categories.entries()) {
        if (!categoryIds.has(catId)) {
          issues.push({
            file: filePath,
            field: `categories[${i}]`,
            message: `category "${catId}" does not exist`,
          });
        }
      }
      for (const [i, areaId] of (entry.areaIds ?? []).entries()) {
        if (!areaIds.has(areaId)) {
          issues.push({
            file: filePath,
            field: `areaIds[${i}]`,
            message: `area "${areaId}" does not exist`,
          });
        }
      }
      for (const [i, indicationId] of (entry.indicationIds ?? []).entries()) {
        if (!indicationIds.has(indicationId)) {
          issues.push({
            file: filePath,
            field: `indicationIds[${i}]`,
            message: `indication "${indicationId}" does not exist`,
          });
        }
      }
      for (const [i, associationId] of (entry.associationIds ?? []).entries()) {
        if (!associationIds.has(associationId)) {
          issues.push({
            file: filePath,
            field: `associationIds[${i}]`,
            message: `association "${associationId}" does not exist`,
          });
        }
      }
      for (const [i, img] of (entry.images ?? []).entries()) {
        if (/^https?:\/\//i.test(img)) continue;
        if (!existsSync(join(ROOT, "public", img))) {
          issues.push({
            file: filePath,
            field: `images[${i}]`,
            message: `referenced image "${img}" does not exist`,
          });
        }
      }
    }
  }

  // Redirect validation
  try {
    const redirects = redirectsFileSchema.parse(
      existsSync(join(ROOT, "data/redirects.json"))
        ? readJsonFile("data/redirects.json")
        : [],
    );
    const liveRoutes = new Set<string>();
    for (const slug of entrySlugs) {
      liveRoutes.add(`/${siteConfig.directory.entryRoute}/${slug}`);
    }
    for (const cat of categories) {
      liveRoutes.add(`/category/${cat.slug}`);
    }
    for (const area of areas) {
      liveRoutes.add(`/area/${area.slug}`);
    }
    for (const indication of indications) {
      liveRoutes.add(`/indikation/${indication.slug}`);
    }
    liveRoutes.add("/indikation");
    for (const association of associations) {
      liveRoutes.add(`/verband/${association.slug}`);
    }
    liveRoutes.add("/verband");
    for (const [i, redirect] of redirects.entries()) {
      if (!redirect.to.startsWith("/")) {
        issues.push({
          file: "data/redirects.json",
          field: `[${i}].to`,
          message: "redirect target must be an absolute path",
        });
      }
      const targetExists =
        liveRoutes.has(redirect.to) ||
        redirects.some((r) => `/${r.from}` === redirect.to || r.to === redirect.to);
      if (!liveRoutes.has(redirect.to) && !redirect.to.startsWith("/category/")) {
        // Allow category targets even if thin
        const catTarget = categories.find((c) => `/category/${c.slug}` === redirect.to);
        const areaTarget = areas.find((a) => `/area/${a.slug}` === redirect.to);
        const indicationTarget = indications.find((item) => `/indikation/${item.slug}` === redirect.to);
        const associationTarget = associations.find((item) => `/verband/${item.slug}` === redirect.to);
        if (
          !catTarget &&
          !areaTarget &&
          !indicationTarget &&
          !associationTarget &&
          redirect.to !== "/" &&
          redirect.to !== "/indikation" &&
          redirect.to !== "/verband"
        ) {
          issues.push({
            file: "data/redirects.json",
            field: `[${i}].to`,
            message: `redirect target "${redirect.to}" does not resolve`,
          });
        }
      }
      if (liveRoutes.has(redirect.from) || entrySlugs.has(redirect.from.replace(/^\/[^/]+\//, ""))) {
        issues.push({
          file: "data/redirects.json",
          field: `[${i}].from`,
          message: `redirect from "${redirect.from}" shadows a live route`,
        });
      }
    }
  } catch (e) {
    issues.push({ file: "data/redirects.json", field: "(root)", message: String(e) });
  }

  // Quality thresholds for collection pages
  const openEntries = [...entrySlugs].length; // simplified; re-load below
  const dataset = (() => {
    try {
      return loadDataset();
    } catch {
      return null;
    }
  })();
  if (dataset) {
    const openByCategory = new Map<string, number>();
    for (const entry of dataset.entries.filter((e) => e.isOpen)) {
      for (const catId of entry.categories) {
        openByCategory.set(catId, (openByCategory.get(catId) ?? 0) + 1);
      }
    }
    for (const cat of categories) {
      const count = openByCategory.get(cat.id) ?? 0;
      if (
        count >= siteConfig.quality.minListingsForCategoryPage &&
        !dataset.categoryIntros.has(cat.id)
      ) {
        issues.push({
          file: `data/generated/category-intros/${cat.id}.json`,
          field: "(missing)",
          message: `indexable category "${cat.id}" requires approved intro content`,
        });
      }
    }
    const openByArea = new Map<string, number>();
    for (const entry of dataset.entries.filter((e) => e.isOpen)) {
      for (const areaId of entry.areaIds ?? []) {
        openByArea.set(areaId, (openByArea.get(areaId) ?? 0) + 1);
      }
    }
    for (const area of areas) {
      const count = openByArea.get(area.id) ?? 0;
      if (
        count >= siteConfig.quality.minListingsForAreaPage &&
        !dataset.areaIntros.has(area.id)
      ) {
        issues.push({
          file: `data/generated/area-intros/${area.id}.json`,
          field: "(missing)",
          message: `indexable area "${area.id}" requires approved intro content`,
        });
      }
    }
    const openByIndication = new Map<string, number>();
    for (const entry of dataset.entries.filter((e) => e.isOpen)) {
      for (const indicationId of entry.indicationIds ?? []) {
        openByIndication.set(indicationId, (openByIndication.get(indicationId) ?? 0) + 1);
      }
    }
    for (const indication of indications) {
      const count = openByIndication.get(indication.id) ?? 0;
      if (
        count >= siteConfig.quality.minListingsForIndicationPage &&
        !dataset.indicationIntros.has(indication.id)
      ) {
        issues.push({
          file: `data/generated/indication-intros/${indication.id}.json`,
          field: "(missing)",
          message: `indexable indication "${indication.id}" requires approved intro content`,
        });
      }
    }
    const openByAssociation = new Map<string, number>();
    for (const entry of dataset.entries.filter((e) => e.isOpen)) {
      for (const associationId of entry.associationIds ?? []) {
        openByAssociation.set(associationId, (openByAssociation.get(associationId) ?? 0) + 1);
      }
    }
    for (const association of associations) {
      const count = openByAssociation.get(association.id) ?? 0;
      if (
        count >= siteConfig.quality.minListingsForAssociationPage &&
        !dataset.associationIntros.has(association.id)
      ) {
        issues.push({
          file: `data/generated/association-intros/${association.id}.json`,
          field: "(missing)",
          message: `indexable association "${association.id}" requires approved intro content`,
        });
      }
    }
  }

  return issues;
}

export function validateOrThrow(): void {
  const issues = validateDataset();
  if (issues.length > 0) {
    throw new Error(formatValidationIssues(issues));
  }
}
