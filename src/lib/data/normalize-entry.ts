import siteConfig from "../../../config/site.config.ts";
import type { Entry } from "../validation/entry-schema.ts";
import { buildNap, normalizePhone, stripEmpty } from "./normalize.ts";

export interface NormalizedEntry extends Entry {
  status: "open" | "closed";
  nap: ReturnType<typeof buildNap>;
  isOpen: boolean;
}

export function normalizeEntry(raw: Entry): NormalizedEntry {
  const status = raw.status ?? "open";
  const phone = normalizePhone(raw.phone, siteConfig.directory.phoneRegion);
  const entry = stripEmpty({
    ...raw,
    status,
    phone,
    areaIds: raw.areaIds ?? [],
    openingHours: raw.openingHours ?? [],
    offers: raw.offers ?? [],
    images: raw.images ?? [],
    faq: raw.faq ?? [],
  }) as Entry & { status: "open" | "closed" };

  return {
    ...entry,
    status,
    nap: buildNap(entry.name, phone, entry.address, siteConfig.directory.phoneRegion),
    isOpen: status === "open",
  };
}

export function isOpenEntry(entry: Pick<NormalizedEntry, "status">): boolean {
  return (entry.status ?? "open") === "open";
}
