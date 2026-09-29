import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const checks = [
  ["public", "https://mj-1.taildc7e9e.ts.net:4443/", "reference/test-captures/tailscale-public.png"],
  ["admin", "https://mj-1.taildc7e9e.ts.net:8443/keystatic", "reference/test-captures/tailscale-admin.png"],
];

for (const [name, url, screenshot] of checks) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(name === "admin" ? 2500 : 800);
  console.log(name, "status", response?.status(), "title", await page.title());
  if (name === "admin") {
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    console.log("admin has brand", /Naïades Tattoo/i.test(text), "has Articles", /Articles/i.test(text));
  }
  await page.screenshot({ path: screenshot, fullPage: true });
}

const blocked = await page.goto("https://mj-1.taildc7e9e.ts.net:4443/keystatic", {
  waitUntil: "domcontentloaded",
  timeout: 45000,
});
console.log("public keystatic final status", blocked?.status(), "url", page.url());

await context.close();
await browser.close();
