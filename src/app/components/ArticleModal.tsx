/**
 * Full-screen article view. "When to call GP/111" section highlighted. Dismiss for 7 days.
 */

import { useEffect } from "react";
import type { ArticleContent } from "../types/article";
import { markArticleDismissed } from "../utils/articleTrigger";
import { X } from "lucide-react";

const GP_HEADING = "When to call your GP or 111";

export interface ArticleModalProps {
  article: ArticleContent;
  onClose: () => void;
}

function splitBody(body: string): { before: string; gpSection: string } {
  const idx = body.indexOf(GP_HEADING);
  if (idx === -1) return { before: body, gpSection: "" };
  const before = body.slice(0, idx).trim();
  const gpSection = body.slice(idx).trim();
  return { before, gpSection };
}

export function ArticleModal({ article, onClose }: ArticleModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const { before, gpSection } = splitBody(article.body);

  const handleDismiss = () => {
    markArticleDismissed(article.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "var(--bg)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-title"
    >
      <div className="min-h-full px-4 py-6 pb-24 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 id="article-title" className="text-lg font-semibold flex-1 pr-2" style={{ color: "var(--tx)" }}>
            {article.title}
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full border flex-shrink-0"
            style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="prose prose-sm max-w-none" style={{ color: "var(--tx)" }}>
          {before.split("\n\n").map((p, i) => (
            <p key={i} className="mb-3 text-[14px] leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {gpSection && (
          <div
            className="mt-6 p-4 rounded-xl border-2"
            style={{
              background: "color-mix(in srgb, var(--ro) 12%, var(--card))",
              borderColor: "var(--ro)",
            }}
          >
            <h2 className="text-[14px] font-semibold mb-2" style={{ color: "var(--tx)" }}>
              {GP_HEADING}
            </h2>
            <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: "var(--tx)" }}>
              {gpSection.replace(GP_HEADING, "").trim()}
            </p>
          </div>
        )}

        <p className="mt-4 text-[12px]" style={{ color: "var(--mu)" }}>
          Last reviewed {article.lastReviewed}
        </p>

        <button
          type="button"
          onClick={handleDismiss}
          className="mt-4 text-[12px] underline"
          style={{ color: "var(--mu)" }}
        >
          Dismiss — don&apos;t show again for a week
        </button>
      </div>
    </div>
  );
}
