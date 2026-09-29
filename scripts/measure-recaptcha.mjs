import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
for (const viewport of [{name:"desktop",width:1440,height:1000},{name:"mobile",width:390,height:844}]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  for (const item of [
    ["original","https://www.naiadestattoo.com/contact"],
    ["clone","http://127.0.0.1:4321/contact"],
  ]) {
    await page.goto(item[1], { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1800);
    const metrics = await page.locator(".w-form-formrecaptcha").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x:r.x, y:r.y, width:r.width, height:r.height, children:el.children.length };
    });
    console.log(viewport.name, item[0], JSON.stringify(metrics), "body", await page.evaluate(() => document.documentElement.scrollHeight));
  }
  await context.close();
}
await browser.close();
