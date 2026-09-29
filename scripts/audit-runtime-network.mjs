
import { chromium } from "@playwright/test";

const routes = [
  "/", "/contact", "/apropos", "/faq", "/accueil", "/articles",
  "/articles/deroulement-seance",
  "/articles/les-soins-tatouage-couleur",
  "/articles/les-soins-tatouage-noir",
  "/articles/demande-projet",
  "/articles/arrhes-et-paiement",
  "/articles/le-sport-apres-un-tatouage",
  "/blog/guerir-grace-au-tatouage",
  "/blog/tatouage-et-consentement",
  "/blog/tatouage-pas-de-compromis",
];
const base = process.env.BASE_URL || "http://127.0.0.1:4322";
const allowed = new URL(base).host;
const browser = await chromium.launch({ headless: true });
const problems = [];
for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const external = new Set();
  const failed = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!/^https?:/.test(url)) return;
    const parsed = new URL(url);
    if (parsed.host !== allowed) external.add(url);
  });
  page.on("requestfailed", (req) => failed.push(req.url() + " :: " + (req.failure()?.errorText || "failed")));
  const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);
  const status = response?.status() || 0;
  console.log(route, "status", status, "external", external.size, "failed", failed.length);
  for (const url of external) console.log("  EXTERNAL", url);
  for (const item of failed) console.log("  FAILED", item);
  if (status !== 200 || external.size || failed.length) problems.push({ route, status, external: [...external], failed });
  await page.close();
}
await browser.close();
if (problems.length) {
  console.error(JSON.stringify(problems, null, 2));
  process.exit(1);
}
