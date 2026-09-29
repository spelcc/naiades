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
  expect(decoded).not.toContain("Mémo des informations :");
  expect(decoded).toContain("- Description de ton projet (histoire, symbolique, etc. tout ce que tu as envie de me partager)");
  expect(decoded).toContain("- La taille approximative et l’emplacement (avec une photo si tu peux)");
  expect(decoded).toContain("- Ton budget");
  expect(decoded).toContain("Toute autre information qui te semble importante :)");

  const footerMail = page.locator('footer a[href^="mailto:naiadestattoo@gmail.com"]').first();
  const footerHref = await footerMail.getAttribute("href");
  expect(decodeURIComponent(footerHref || "")).toContain("Hello Naïades,");
});


test("hamburger becomes a visible close icon while menu is open", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const button = page.locator(".menu-button").first();
    await expect(button).toBeVisible();
    await expect(button).not.toHaveClass(/w--open/);

    const closed = await button.evaluate((el) => {
      const style = getComputedStyle(el);
      const before = getComputedStyle(el, "::before");
      const after = getComputedStyle(el, "::after");
      return {
        backgroundSize: style.backgroundSize,
        beforeTransform: before.transform,
        afterTransform: after.transform,
        beforeColor: before.backgroundColor,
        afterColor: after.backgroundColor,
      };
    });

    expect(closed.backgroundSize).toContain("24px");
    expect(closed.beforeColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(closed.afterColor).not.toBe("rgba(0, 0, 0, 0)");

    await button.click();
    await expect(button).toHaveClass(/w--open/);
    await expect(page.locator(".nav-menu")).toBeVisible();

    const open = await button.evaluate((el) => {
      const style = getComputedStyle(el);
      const before = getComputedStyle(el, "::before");
      const after = getComputedStyle(el, "::after");
      return {
        backgroundSize: style.backgroundSize,
        beforeTransform: before.transform,
        afterTransform: after.transform,
        beforeColor: before.backgroundColor,
        afterColor: after.backgroundColor,
      };
    });

    expect(open.backgroundSize).toMatch(/^0px/);
    expect(open.beforeTransform).not.toBe(closed.beforeTransform);
    expect(open.afterTransform).not.toBe(closed.afterTransform);
    expect(open.beforeColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(open.afterColor).not.toBe("rgba(0, 0, 0, 0)");

    await button.click();
    await expect(button).not.toHaveClass(/w--open/);
  }
});
