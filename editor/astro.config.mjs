import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import cloudflare from "@astrojs/cloudflare";
import keystaticCloudflare from "./keystatic-cloudflare.mjs";

export default defineConfig({
  site: "https://naiades.irz.fr",
  output: "server",
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [react(), markdoc(), keystaticCloudflare()],
  devToolbar: { enabled: false },
});
