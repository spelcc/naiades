import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

async function publishedArticleCount() {
  const dir = path.join(process.cwd(), "src/content/articles");
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith(".mdoc"));
  let count = 0;
  for (const file of files) {
    const text = await fs.readFile(path.join(dir, file), "utf8");
    if (/"status":\s*"published"/.test(text)) count++;
  }
  return count;
}

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
  await expect(page.locator(".naiades-article-card")).toHaveCount(await publishedArticleCount());
  await expect(page.locator(".naiades-pagination")).toHaveCount(0);
  await expect(page.locator(".uui-blogpost01_breadcrumb")).toHaveCount(0);
  await expect(page.locator(".text-block", { hasText: "Articles" })).toHaveCount(0);

  const sportCard = page.locator(".naiades-article-card").filter({ hasText: "Je conseille toujours de ne pas faire de sport" }).first();
  await expect(sportCard).toHaveCSS("text-decoration-line", "none");
  await expect(sportCard.locator("p")).toHaveCSS("text-decoration-line", "none");
  await expect(sportCard.locator("span")).toHaveCSS("color", "rgb(8, 105, 104)");
  await expect(sportCard.locator("span")).toHaveCSS("text-decoration-line", "underline");

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
  const second = page.locator(".uui-faq02_accordion").nth(1);
  await expect(first.locator(".uui-faq02_heading")).toHaveText("Comment réserver un flash ?");

  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(secondBox.y - (firstBox.y + firstBox.height)).toBeGreaterThanOrEqual(12);

  const questionGap = parseFloat(await first.locator(".uui-faq02_question").evaluate((el) => getComputedStyle(el).gap));
  expect(questionGap).toBeGreaterThanOrEqual(16);

  const answerContent = first.locator(".uui-faq02_answer > .uui-max-width-large-2");
  await expect(answerContent).toHaveCSS("opacity", "0");

  await first.locator(".uui-faq02_question").click();
  const answer = first.locator(".uui-faq02_answer");
  await expect(first).toHaveAttribute("data-faq-open", "true");
  await expect(first.locator(".uui-faq02_question")).toHaveAttribute("aria-expanded", "true");
  await expect(answer).not.toHaveCSS("height", "0px");
  await expect(answer).toHaveCSS("padding-bottom", "24px");
  await expect(answerContent).toHaveCSS("opacity", "1");
  await expect(answerContent).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await expect(answer).toContainText("Contacte-moi via");
  await expect(first.locator('a[href="/contact"]')).toHaveText("ce formulaire");

  await second.locator(".uui-faq02_question").click();
  await expect(second).toHaveAttribute("data-faq-open", "true");
  await expect(first).toHaveAttribute("data-faq-open", "false");
  await expect(first.locator(".uui-faq02_answer")).toHaveCSS("height", "0px");
  await expect(answerContent).toHaveCSS("opacity", "0");
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

  const allMailtos = await page.locator('a[href^="mailto:naiadestattoo@gmail.com"]').evaluateAll(
    (links) => links.map((link) => link.getAttribute("href")),
  );
  expect(new Set(allMailtos).size).toBe(1);
  expect(allMailtos[0]).toBe(href);
});


test("hamburger becomes a visible close icon while menu is open", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 820, height: 900 },
    { width: 991, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const button = page.locator(".menu-button").first();
    await expect(button).toBeVisible();
    await expect(button).not.toHaveClass(/w--open/);

    const closedBox = await button.boundingBox();
    const navBox = await page.locator(".nav-wrapper").first().boundingBox();
    expect(closedBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(Math.abs((closedBox.x + closedBox.width) - (navBox.x + navBox.width))).toBeLessThanOrEqual(1);

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

    const openBox = await button.boundingBox();
    expect(openBox).not.toBeNull();
    expect(Math.abs(openBox.x - closedBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(openBox.y - closedBox.y)).toBeLessThanOrEqual(1);

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


test("Studio Pixel link uses body text styling", async ({ page }) => {
  await page.goto("/apropos", { waitUntil: "domcontentloaded" });
  const link = page.locator('a[href="https://lestudiopixel.com/"]').first();
  await expect(link).toHaveText("Studio Pixel");
  await expect(link.locator("strong")).toHaveCount(0);
  await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(link).toHaveCSS("font-weight", "400");
  await expect(link.locator("xpath=..")).toContainText("Studio Pixel, un studio de tatouage privé et inclusif.");
});


test("workflow steps expose three editable article CTAs", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const ctas = page.locator(".workflow-more-link");
  await expect(ctas).toHaveCount(3);
  await expect(ctas.nth(0)).toHaveAttribute("href", "/articles/demande-projet");
  await expect(ctas.nth(1)).toHaveAttribute("href", "/articles/demande-projet#le-travail-du-dessin");
  await expect(ctas.nth(2)).toHaveAttribute("href", "/articles/deroulement-seance");

  await page.goto("/articles/demande-projet#le-travail-du-dessin", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#le-travail-du-dessin")).toContainText("Le travail du dessin");
});


test("copyright year follows the current year", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const copyright = page.locator(".copyright-text-wrapper .button-text").first();
  await expect(copyright).toContainText("Copyright © " + new Date().getFullYear() + " Naïades Tattoo");
});


test("opened menu uses Instagram instead of phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".menu-button").first().click();
  const menu = page.locator(".nav-menu").first();
  await expect(menu).toBeVisible();
  await expect(menu.locator('a[href^="tel:"]')).toHaveCount(0);
  const instagram = menu.locator('a[href="https://www.instagram.com/naiadestattoo/"]').filter({ hasText: "@naiadestattoo" }).first();
  await expect(instagram).toBeVisible();
  await expect(instagram.locator(".nav-instagram-icon")).toHaveCount(1);

  await page.waitForTimeout(850);
  const instagramBox = await instagram.boundingBox();
  expect(instagramBox).not.toBeNull();
  expect(instagramBox.y + instagramBox.height).toBeLessThanOrEqual(568);
});
