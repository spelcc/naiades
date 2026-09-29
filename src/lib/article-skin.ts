import * as cheerio from "cheerio";
import { loadSourcePage } from "./source-pages";

function headingSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function renderArticleSkin(options: {
  title: string;
  contentHtml: string;
  breadcrumbHref?: string;
  breadcrumbLabel?: string;
  showBreadcrumb?: boolean;
}) {
  const source = await loadSourcePage("articles__deroulement-seance");
  const $ = cheerio.load(source.html, null, false);
  $("h1.uui-heading-large").first().text(options.title);
  const richText = $(".uui-text-rich-text.w-richtext").first();
  richText.html(options.contentHtml);
  if (options.showBreadcrumb !== false) {
    const usedIds = new Set<string>();
    richText.find("h2, h3, h4, h5, h6").each((_index, element) => {
      const heading = $(element);
      const base = headingSlug(heading.text()) || "section";
      let id = base;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = base + "-" + suffix++;
      }
      usedIds.add(id);
      heading.attr("id", id);
    });
  }
  const breadcrumbWrapper = $(".uui-blogpost01_breadcrumb").first();
  if (options.showBreadcrumb === false) {
    breadcrumbWrapper.remove();
  } else {
    const breadcrumb = breadcrumbWrapper.find("a").first();
    breadcrumb.attr("href", options.breadcrumbHref || "/articles");
    breadcrumb.find("div").first().text(options.breadcrumbLabel || "Articles");
  }
  return { ...source, html: $.html() };
}
