import { createReader } from "@keystatic/core/reader";
import Markdoc from "@markdoc/markdoc";
import { load } from "cheerio";
import keystaticConfig from "../../keystatic.config";
import { loadSourcePage } from "./source-pages";

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function renderMarkdocNode(node: any): string {
  if (node == null) return "";
  if (typeof node === "string") return escapeHtml(node);
  if (Array.isArray(node)) return node.map(renderMarkdocNode).join("");
  if (node.type === "text") return escapeHtml(node.attributes?.content ?? "");
  if (node.$$mdtype === "Tag" || node.type === "tag") {
    const name = node.name;
    const children = renderMarkdocNode(node.children || []);
    if (name === "p") return children;
    if (name === "a") return '<a href="' + escapeHtml(node.attributes?.href || "") + '">' + children + "</a>";
    if (name === "strong") return "<strong>" + children + "</strong>";
    if (name === "em") return "<em>" + children + "</em>";
    if (name === "br") return "<br>";
    if (name === "ul") return "<ul>" + children + "</ul>";
    if (name === "ol") return "<ol>" + children + "</ol>";
    if (name === "li") return "<li>" + children + "</li>";
    return children;
  }
  return renderMarkdocNode(node.children || []);
}

export async function renderFaqPage() {
  const source = await loadSourcePage("faq");
  const reader = createReader(process.cwd(), keystaticConfig);
  const entries = await reader.collections.faq.all();
  const items = await Promise.all(entries.map(async ({ slug, entry }) => {
    const document = await entry.answer();
    const transformed = Markdoc.transform(document.node as any);
    return {
      slug,
      question: entry.question,
      section: entry.section || "Général",
      order: entry.order ?? 999,
      answerHtml: renderMarkdocNode(transformed),
    };
  }));
  items.sort((a, b) => a.order - b.order || a.question.localeCompare(b.question, "fr"));

  const $ = load(source.html);
  const container = $(".uui-faq02_list").first();
  if (!container.length) throw new Error("FAQ accordion container not found");

  container.empty();
  for (const item of items) {
    const html = [
      '<div style="background-color:rgb(255,255,255)" class="uui-faq02_accordion" data-faq-slug="' + escapeHtml(item.slug) + '">',
      '<div class="uui-faq02_question">',
      '<div class="uui-faq02_heading">' + escapeHtml(item.question) + '</div>',
      '<div class="uui-faq02_icon-wrapper"><div class="accordion-icon_component"><div class="accordion-icon_horizontal-line"></div><div class="accordion-icon_vertical-line"></div></div></div>',
      '</div>',
      '<div style="width:100%;height:0px" class="uui-faq02_answer"><div class="uui-max-width-large-2"><div class="uui-text-size-medium">' + item.answerHtml + '</div></div></div>',
      '</div>'
    ].join("");
    container.append(html);
  }

  return { ...source, html: $.root().html() || source.html, faqCount: items.length };
}
