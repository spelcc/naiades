// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import node from "@astrojs/node";
import keystatic from "@keystatic/astro";

const target = process.env.DEPLOY_TARGET || "node";
const githubPages = target === "github-pages";
const publicOnly = githubPages || process.env.PUBLIC_ONLY === "true";

export default defineConfig({
  ...(githubPages ? { site: "https://www.naiadestattoo.com", base: "/" } : {}),
  output: githubPages ? "static" : "server",
  outDir: githubPages ? "./dist-pages" : publicOnly ? "./dist-public" : "./dist",
  ...(githubPages ? {} : { adapter: node({ mode: "standalone" }) }),
  integrations: [
    react(),
    markdoc(),
    ...(publicOnly ? [] : [keystatic()]),
  ],
  server: { host: true },
  vite: {
    server: {
      allowedHosts: ["mj-1.taildc7e9e.ts.net"],
    },
  },
});
