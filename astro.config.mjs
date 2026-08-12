// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import siteConfig from "./config/site.config.ts";

export default defineConfig({
  site: siteConfig.site.origin,
  output: "static",
  integrations: [
    sitemap({
      filter: (page) => !page.includes("noindex"),
    }),
  ],
});
