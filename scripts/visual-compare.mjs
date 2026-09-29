import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const root = process.cwd();
const start = Number(process.argv[2] || 0);
const count = Number(process.argv[3] || 4);

const status = await fs.readFile(path.join(root, "reference/url-status.txt"), "utf8");
const allUrls = status.split("\n")
  .filter(Boolean)
  .map((line) => line.split(" | ")[0])
  .filter((url) => !url.endsWith("/portfolio"));
const urls = allUrls.slice(start, start + count);

const modes = [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
];

const stableCss = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  .grecaptcha-badge, iframe[src*="recaptcha"] { visibility: hidden !important; }
`;

const slugFor = (url) => {
  const u = new URL(url);
  return u.pathname === "/" ? "index" : u.pathname.slice(1).replaceAll("/", "__");
};

async function settle(page) {
  await page.addStyleTag({ content: stableCss });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = [...document.images].filter((img) => !img.complete);
    await Promise.race([
      Promise.all(images.map((img) => new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      }))),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  });
  await page.waitForTimeout(350);
}

function padToSameSize(a, b) {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const make = () => {
    const png = new PNG({ width, height });
    png.data.fill(255);
    return png;
  };
  const aa = make();
  const bb = make();
  PNG.bitblt(a, aa, 0, 0, a.width, a.height, 0, 0);
  PNG.bitblt(b, bb, 0, 0, b.width, b.height, 0, 0);
  return [aa, bb];
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const mode of modes) {
  const context = await browser.newContext({
    viewport: mode.viewport,
    deviceScaleFactor: 1,
    locale: "fr-FR",
  });
  const page = await context.newPage();

  for (const sourceUrl of urls) {
    const slug = slugFor(sourceUrl);
    const cloneUrl = new URL(new URL(sourceUrl).pathname, process.env.CLONE_BASE || "http://127.0.0.1:4321").href;
    const originalPath = path.join(root, "reference/screenshots/original", `${slug}-${mode.name}.png`);
    const clonePath = path.join(root, "reference/screenshots/clone", `${slug}-${mode.name}.png`);
    const diffPath = path.join(root, "reference/screenshots/diff", `${slug}-${mode.name}.png`);
    await fs.mkdir(path.dirname(originalPath), { recursive: true });
    await fs.mkdir(path.dirname(clonePath), { recursive: true });
    await fs.mkdir(path.dirname(diffPath), { recursive: true });

    for (const [kind, url, output] of [
      ["original", sourceUrl, originalPath],
      ["clone", cloneUrl, clonePath],
    ]) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await settle(page);
      await page.screenshot({ path: output, fullPage: true });
      console.log(`${mode.name} ${slug} ${kind} captured`);
    }

    const original = PNG.sync.read(await fs.readFile(originalPath));
    const clone = PNG.sync.read(await fs.readFile(clonePath));
    const [a, b] = padToSameSize(original, clone);
    const diff = new PNG({ width: a.width, height: a.height });
    const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
      threshold: 0.12,
      includeAA: false,
    });
    await fs.writeFile(diffPath, PNG.sync.write(diff));
    const ratio = mismatched / (a.width * a.height);
    const result = {
      slug,
      mode: mode.name,
      original: { width: original.width, height: original.height },
      clone: { width: clone.width, height: clone.height },
      mismatched,
      ratio,
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  await context.close();
}

await browser.close();
const resultFile = path.join(root, "reference", `visual-results-${start}-${start + urls.length - 1}.json`);
await fs.writeFile(resultFile, JSON.stringify(results, null, 2) + "\n");
console.log(`RESULT_FILE ${resultFile}`);
