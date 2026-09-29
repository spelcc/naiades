import { chromium } from "@playwright/test";
const sels = [".contact-section",".contact-container",".contact-form-container",".contact-form",".contact-form-wrapper","#first-name","#email","#field-2",".w-form-formrecaptcha",".submit-button-wrapper",".footer"];
const browser = await chromium.launch({ headless:true });
for (const viewport of [{name:"desktop",width:1440,height:1000},{name:"mobile",width:390,height:844}]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  for (const [kind,url] of [["original","https://www.naiadestattoo.com/contact"],["clone","http://127.0.0.1:4321/contact"]]) {
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
    await page.waitForTimeout(1800);
    console.log("\n"+viewport.name+" "+kind);
    for (const sel of sels) {
      const loc=page.locator(sel).first();
      if (await loc.count()) {
        const r=await loc.boundingBox();
        console.log(sel, r && {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});
      }
    }
  }
  await context.close();
}
await browser.close();
