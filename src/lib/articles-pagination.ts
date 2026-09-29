export const ARTICLES_PER_PAGE = 20;

export type ArticleListItem = {
  title: string;
  excerpt: string;
  href: string;
  publishedAt: string | null;
};

export function sortArticlesByPublishedAt(items: ArticleListItem[]) {
  return [...items].sort((a, b) => {
    const dateCompare = (b.publishedAt || "").localeCompare(a.publishedAt || "");
    if (dateCompare !== 0) return dateCompare;
    return a.title.localeCompare(b.title, "fr");
  });
}

export function paginateArticles(
  items: ArticleListItem[],
  page: number,
  perPage = ARTICLES_PER_PAGE,
) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (currentPage - 1) * perPage;

  return {
    items: items.slice(start, start + perPage),
    currentPage,
    totalPages,
    totalItems: items.length,
  };
}

export function articlePageHref(page: number) {
  return page <= 1 ? "/articles" : "/articles/page/" + page;
}

export function paginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([
    1,
    2,
    totalPages - 1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}
