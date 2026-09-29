import test from "node:test";
import assert from "node:assert/strict";
import { isPublishedArticle } from "../../src/lib/article-visibility.ts";

test("only explicitly published articles are public", () => {
  assert.equal(isPublishedArticle({ status: "published" }), true);
  assert.equal(isPublishedArticle({ status: "draft" }), false);
  assert.equal(isPublishedArticle({ status: null }), false);
  assert.equal(isPublishedArticle({}), false);
});
