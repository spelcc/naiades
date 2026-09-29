import { test, expect } from "@playwright/test";

const routes = [
  "/",
  "/contact",
  "/apropos",
  "/faq",
  "/accueil",
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

test("all source routes and Articles list render", async ({ page }) => {
  for (const route of [...routes, "/articles"]) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("body")).not.toBeEmpty();
  }
});

test("mobile pages do not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, route).toBeLessThanOrEqual(1);
  }
});

test("Articles list uses the existing visual language", async ({ page }) => {
  await page.goto("/articles", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1.uui-heading-large")).toHaveText("Articles");
  await expect(page.locator(".naiades-article-card")).toHaveCount(6);
  await page.screenshot({ path: "reference/test-captures/articles-list.png", fullPage: true });
});

test("Keystatic backend loads", async ({ page }) => {
  const response = await page.goto("http://127.0.0.1:4322/keystatic", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.locator("body")).toContainText("Articles");
  await expect(page.locator("body")).toContainText("9 entries");
  await expect(page.locator("body")).toContainText("FAQ");
  await expect(page.locator("body")).toContainText("12 entries");
  await expect(page.locator("body")).not.toContainText("Article ·");
  await expect(page.locator("body")).not.toContainText("Blog ·");
  await page.screenshot({ path: "reference/test-captures/keystatic.png", fullPage: true });
});



test("FAQ collection renders and accordion opens", async ({ page }) => {
  await page.goto("/faq", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".uui-faq02_accordion")).toHaveCount(12);
  const first = page.locator(".uui-faq02_accordion").first();
  await expect(first.locator(".uui-faq02_heading")).toHaveText("Comment réserver un flash ?");
  await first.locator(".uui-faq02_question").click();
  await expect(first.locator(".uui-faq02_answer")).toHaveCSS("height", /[1-9][0-9]*px|auto/);
  await expect(first.locator(".uui-faq02_answer")).toContainText("Contacte-moi via");
  await expect(first.locator('a[href="/contact"]')).toHaveText("ce formulaire");
});

test("contact page uses a prefilled email CTA and no form image", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".contact-image-wrapper")).toHaveCount(0);
  await expect(page.locator("#wf-form-Contact-Form")).toHaveCount(0);

  const cta = page.locator(".naiades-contact-mail-row a").first();
  await expect(cta).toHaveText("Me contacter");

  const href = await cta.getAttribute("href");
  expect(href).toBeTruthy();
  expect(href).toContain("mailto:naiadestattoo@gmail.com?");
  const decoded = decodeURIComponent(href);
  expect(decoded).toContain("Hello Naïades,");
  expect(decoded).toContain("Mémo des informations :");
  expect(decoded).toContain("- Ton budget max");
  expect(decoded).toContain("mood board");

  const footerMail = page.locator('footer a[href^="mailto:naiadestattoo@gmail.com"]').first();
  const footerHref = await footerMail.getAttribute("href");
  expect(decodeURIComponent(footerHref || "")).toContain("Hello Naïades,");
});
