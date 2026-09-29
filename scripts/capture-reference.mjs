import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const status = await fs.readFile(path.join(root, "reference/url-status.txt"), "utf8");
const urls = status.split("\n").filter(Boolean)
  .map(line => line.split(" | ")[0])
  .filter(url => !url.endsWith("/portfolio"));
const browsers = [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
];
const browser = await chromium.launch({ headless: true });
for (const mode of browsers) {
  const context = await browser.newContext({ viewport: mode.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  for (const url of urls) {
    const u = new URL(url);
    const slug = u.pathname === "/" ? "index" : u.pathname.slice(1).replaceAll("/", "__");
    console.log(`${mode.name}: ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(root, "reference/screenshots/original", `${slug}-${mode.name}.png`), fullPage: true });
    if (mode.name === "desktop") {
      const summary = await page.evaluate(() => {
        const clean = s => (s || "").replace(/\s+/g, " ").trim();
        const sections = [...document.querySelectorAll("body > *")].map((el, i) => ({
          i,
          tag: el.tagName.toLowerCase(),
          className: typeof el.className === "string" ? el.className : "",
          text: clean(el.textContent).slice(0, 1000),
          rect: el.getBoundingClientRect().toJSON(),
          bg: getComputedStyle(el).backgroundColor,
        }));
        const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(el => ({
          tag: el.tagName.toLowerCase(), text: clean(el.textContent), className: el.className,
          font: getComputedStyle(el).fontFamily, size: getComputedStyle(el).fontSize,
          weight: getComputedStyle(el).fontWeight, color: getComputedStyle(el).color,
        }));
        const images = [...document.images].map(img => ({ src: img.currentSrc || img.src, alt: img.alt, className: img.className, width: img.naturalWidth, height: img.naturalHeight }));
        const links = [...document.querySelectorAll("a")].map(a => ({ text: clean(a.textContent), href: a.href, className: a.className }));
        const bodyStyle = getComputedStyle(document.body);
        return { title: document.title, lang: document.documentElement.lang, bodyText: clean(document.body.innerText), bodyStyle: { fontFamily: bodyStyle.fontFamily, fontSize: bodyStyle.fontSize, color: bodyStyle.color, backgroundColor: bodyStyle.backgroundColor }, sections, headings, images, links };
      });
      await fs.writeFile(path.join(root, "reference", `${slug}-dom.json`), JSON.stringify(summary, null, 2));
    }
  }
  await context.close();
}
await browser.close();
