export type ArticleVisibility = {
  status?: "draft" | "published" | null;
};

export function isPublishedArticle(entry: ArticleVisibility) {
  return entry.status === "published";
}
