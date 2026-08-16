// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import siteConfig from "./config/site.config.ts";
import { loadDataset } from "./src/lib/data/load-dataset.ts";
import { createLastmodResolver } from "./src/lib/seo/sitemap-lastmod.ts";

const lastmodResolver = createLastmodResolver(loadDataset());

export default defineConfig({
  site: siteConfig.site.origin,
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => !page.includes("noindex"),
      serialize(item) {
        const lastmod = lastmodResolver.resolve(item.url);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Bricolage Grotesque",
      cssVariable: "--font-display",
      weights: ["400 800"],
      styles: ["normal"],
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        experimental: {
          // Preserve the opsz optical-size axis from the original
          // `opsz,wght@12..96,...` Google Fonts request.
          variableAxis: {
            opsz: [["12", "96"]],
          },
        },
      },
    },
    {
      provider: fontProviders.google(),
      name: "Karla",
      cssVariable: "--font-sans",
      weights: [400, 500, 700],
      styles: ["normal"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "Space Grotesk",
      cssVariable: "--font-mono",
      weights: [400, 500, 700],
      styles: ["normal"],
      fallbacks: ["ui-monospace", "monospace"],
    },
  ],
});
