import test from "node:test";
import assert from "node:assert/strict";
import {
  ARTICLES_PER_PAGE,
  articlePageHref,
  paginateArticles,
  paginationPages,
  sortArticlesByPublishedAt,
} from "../../src/lib/articles-pagination.ts";

const makeItems = (count) => Array.from({ length: count }, (_, index) => ({
  title: "Article " + String(index + 1).padStart(2, "0"),
  excerpt: "",
  href: "/articles/article-" + (index + 1),
  publishedAt: "2026-09-" + String((index % 28) + 1).padStart(2, "0"),
}));

test("article pagination displays 20 items per page", () => {
  const items = makeItems(45);
  const first = paginateArticles(items, 1);
  const second = paginateArticles(items, 2);
  const third = paginateArticles(items, 3);

  assert.equal(ARTICLES_PER_PAGE, 20);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 20);
  assert.equal(third.items.length, 5);
  assert.equal(first.totalPages, 3);
});

test("article pagination is hidden when there is only one page worth of items", () => {
  const page = paginateArticles(makeItems(20), 1);
  assert.equal(page.totalPages, 1);
  assert.equal(page.items.length, 20);
});

test("articles are sorted newest first with title as stable fallback", () => {
  const sorted = sortArticlesByPublishedAt([
    { title: "Beta", excerpt: "", href: "/b", publishedAt: "2026-09-20" },
    { title: "Alpha", excerpt: "", href: "/a", publishedAt: "2026-09-20" },
    { title: "Gamma", excerpt: "", href: "/g", publishedAt: "2026-09-29" },
  ]);

  assert.deepEqual(sorted.map((item) => item.title), ["Gamma", "Alpha", "Beta"]);
});

test("pagination URLs and compact page range are stable", () => {
  assert.equal(articlePageHref(1), "/articles");
  assert.equal(articlePageHref(2), "/articles/page/2");
  assert.deepEqual(paginationPages(5, 10), [1, 2, 4, 5, 6, 9, 10]);
});
