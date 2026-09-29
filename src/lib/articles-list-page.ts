import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";
import { renderArticleSkin } from "./article-skin";
import { isPublishedArticle } from "./article-visibility";
import { getArticlesSettings, prefixLocalHtml } from "./source-pages";
import {
  ARTICLES_PER_PAGE,
  articlePageHref,
  paginateArticles,
  paginationPages,
  sortArticlesByPublishedAt,
  type ArticleListItem,
} from "./articles-pagination";

const esc = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

export async function getArticleListItems() {
  const reader = createReader(process.cwd(), keystaticConfig);
  const entries = await reader.collections.articles.all();
  const cards: ArticleListItem[] = entries
    .filter(({ entry }) => isPublishedArticle(entry))
    .map(({ slug, entry }) => ({
      title: entry.displayTitle || entry.title,
      excerpt: entry.excerpt || "",
      href: "/articles/" + slug,
      publishedAt: entry.publishedAt || null,
    }));

  return sortArticlesByPublishedAt(cards);
}

export async function getArticleListPageCount() {
  const cards = await getArticleListItems();
  return Math.max(1, Math.ceil(cards.length / ARTICLES_PER_PAGE));
}

function renderPagination(currentPage: number, totalPages: number) {
  if (totalPages <= 1) return "";

  const pages = paginationPages(currentPage, totalPages);
  let previous = 0;
  const pageLinks = pages.map((page) => {
    const gap = previous && page - previous > 1
      ? '<span class="naiades-pagination-ellipsis" aria-hidden="true">…</span>'
      : "";
    previous = page;
    const current = page === currentPage;
    return gap
      + '<a class="naiades-pagination-page' + (current ? ' is-current' : '') + '"'
      + ' href="' + articlePageHref(page) + '"'
      + (current ? ' aria-current="page"' : '')
      + '>' + page + '</a>';
  }).join("");

  const prev = currentPage > 1
    ? '<a class="naiades-pagination-nav" href="' + articlePageHref(currentPage - 1) + '">← Précédent</a>'
    : '<span class="naiades-pagination-nav is-disabled" aria-hidden="true">← Précédent</span>';

  const next = currentPage < totalPages
    ? '<a class="naiades-pagination-nav" href="' + articlePageHref(currentPage + 1) + '">Suivant →</a>'
    : '<span class="naiades-pagination-nav is-disabled" aria-hidden="true">Suivant →</span>';

  return '<nav class="naiades-pagination" aria-label="Pagination des articles">'
    + prev
    + '<div class="naiades-pagination-pages">' + pageLinks + '</div>'
    + next
    + '</nav>';
}

export async function renderArticleListPage(page = 1) {
  const [settings, cards] = await Promise.all([
    getArticlesSettings(),
    getArticleListItems(),
  ]);
  const pagination = paginateArticles(cards, page);

  const cardsHtml = '<div class="naiades-article-grid">'
    + pagination.items.map((card) =>
      '<a class="naiades-article-card" href="' + esc(card.href) + '">'
      + '<h2>' + esc(card.title) + '</h2>'
      + '<p>' + esc(card.excerpt) + '</p>'
      + '<span>Lire l’article →</span>'
      + '</a>'
    ).join("")
    + '</div>';

  const paginationHtml = renderPagination(pagination.currentPage, pagination.totalPages);
  const skin = await renderArticleSkin({
    title: settings.title,
    contentHtml: '<p class="naiades-articles-intro">' + esc(settings.intro) + '</p>' + cardsHtml + paginationHtml,
    showBreadcrumb: false,
  });

  return {
    settings,
    skin,
    pageHtml: prefixLocalHtml(skin.html),
    ...pagination,
  };
}
