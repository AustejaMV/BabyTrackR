/**
 * Load full article content by id.
 */

import type { ArticleContent } from "../types/article";
import { getArticleById } from "../data/articles";

export function loadArticle(id: string): ArticleContent | null {
  if (!id || typeof id !== "string") return null;
  const article = getArticleById(id.trim());
  if (!article) return null;
  return article;
}
