import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const entries = [
  { slug: "austin-wellness-massage", name: "Austin Wellness Massage", cat: "wellness-massage", area: "central-austin", status: "open", price: 85, phone: "+15125550101" },
  { slug: "central-healing-touch", name: "Central Healing Touch", cat: "wellness-massage", area: "central-austin", status: "open", price: 75, phone: "+15125550102" },
  { slug: "downtown-relaxation", name: "Downtown Relaxation Studio", cat: "wellness-massage", area: "central-austin", status: "open", price: 90, phone: "+15125550103" },
  { slug: "congress-therapy", name: "Congress Therapy Center", cat: "wellness-massage", area: "central-austin", status: "open", price: 80, phone: "+15125550104" },
  { slug: "riverside-bodywork", name: "Riverside Bodywork", cat: "wellness-massage", area: "south-austin", status: "open", price: 70, phone: "+15125550105" },
  { slug: "east-side-massage", name: "East Side Massage Co", cat: "wellness-massage", area: "south-austin", status: "open", price: 65, phone: "+15125550106" },
  { slug: "closed-downtown-spa", name: "Closed Downtown Spa", cat: "wellness-massage", area: "central-austin", status: "closed", price: 0, phone: "+15125550107" },
  { slug: "south-lamar-massage", name: "South Lamar Massage", cat: "deep-tissue-therapy", area: "south-austin", status: "open", price: 95, phone: "+15125550108" },
  { slug: "deep-tissue-pros", name: "Deep Tissue Pros", cat: "deep-tissue-therapy", area: "central-austin", status: "open", price: 100, phone: "+15125550109" },
  { slug: "sports-recovery-austin", name: "Sports Recovery Austin", cat: "deep-tissue-therapy", area: "south-austin", status: "open", price: 110, phone: "+15125550110" },
  { slug: "muscle-relief-austin", name: "Muscle Relief Austin", cat: "deep-tissue-therapy", area: "central-austin", status: "open", price: 88, phone: "+15125550111" },
  { slug: "zen-retreat-spa", name: "Zen Retreat Spa", cat: "spa-relaxation", area: "south-austin", status: "open", price: 150, phone: "+15125550112" },
  { slug: "hill-country-spa", name: "Hill Country Spa", cat: "spa-relaxation", area: "south-austin", status: "open", price: 140, phone: "+15125550113" },
];

const dir = join(process.cwd(), "data/entries");
mkdirSync(dir, { recursive: true });

for (const [i, e] of entries.entries()) {
  const entry = {
    id: e.slug,
    slug: e.slug,
    name: e.name,
    description: `${e.name} provides professional services in Austin, Texas with licensed staff and transparent pricing.`,
    lastUpdated: "2026-08-01",
    status: e.status,
    categories: [e.cat],
    areaIds: [e.area],
    address: {
      street: `${100 + i} Example St`,
      locality: "Austin",
      region: "Texas",
      postalCode: "78701",
      country: "US",
    },
    geo: { lat: 30.26 + i * 0.001, lng: -97.74 - i * 0.001 },
    phone: e.phone,
    website: `https://example-${e.slug}.com`,
    openingHours:
      e.status === "open"
        ? [
            { day: "Monday", open: "09:00", close: "20:00" },
            { day: "Tuesday", open: "09:00", close: "20:00" },
            { day: "Wednesday", open: "09:00", close: "20:00" },
            { day: "Thursday", open: "09:00", close: "20:00" },
            { day: "Friday", open: "09:00", close: "20:00" },
          ]
        : [],
    offers:
      e.status === "open"
        ? [{ name: "Standard Session", durationMinutes: 60, price: e.price }]
        : [],
  };
  writeFileSync(join(dir, `${e.slug}.json`), `${JSON.stringify(entry, null, 2)}\n`);
}

console.log(`Wrote ${entries.length} entries`);
