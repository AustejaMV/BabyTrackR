/**
 * Compact card for a triggered article: title, excerpt, Read button.
 */

import type { ArticleMeta } from "../types/article";
import { BookOpen } from "lucide-react";

export interface ArticleCardProps {
  article: ArticleMeta;
  onRead: () => void;
}

export function ArticleCard({ article, onRead }: ArticleCardProps) {
  return (
    <div
      className="rounded-2xl border p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="article"
      aria-label={article.title}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--la)" }}>
          <BookOpen className="w-5 h-5" style={{ color: "var(--purp)" }} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            {article.title}
          </h3>
          <p className="text-[13px] mt-0.5 line-clamp-2" style={{ color: "var(--mu)" }}>
            {article.excerpt}
          </p>
          <button
            type="button"
            onClick={onRead}
            className="mt-2 py-2 px-3 rounded-xl text-[13px] font-medium"
            style={{ background: "var(--pink)", color: "white" }}
          >
            Read
          </button>
        </div>
      </div>
    </div>
  );
}
