import * as cheerio from "cheerio";
import { loadSourcePage } from "./source-pages";

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
  $(".uui-text-rich-text.w-richtext").first().html(options.contentHtml);
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
