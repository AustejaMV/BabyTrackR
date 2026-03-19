import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { markArticleDismissed } from "../utils/articleTrigger";
import type { ArticleMeta } from "../types/article";

export interface ContextualArticleCardProps {
  article: ArticleMeta;
  onDismiss: (id: string) => void;
  onTap?: (id: string) => void;
}

export function ContextualArticleCard({ article, onDismiss, onTap }: ContextualArticleCardProps) {
  const [showWhyThis, setShowWhyThis] = useState(false);

  const handleDismiss = () => {
    markArticleDismissed(article.id);
    onDismiss(article.id);
  };

  const triggerLabel =
    article.triggerConditions.length > 0
      ? article.triggerConditions[0]
          .replace(/_/g, " ")
          .replace(/^\w/, (c) => c.toUpperCase())
      : "Based on your data";

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 14,
        border: "1px solid var(--bd)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => onTap?.(article.id)}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: 12,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px",
                borderRadius: 6, background: "var(--pe)", color: "var(--coral)",
              }}
            >
              Suggested for you
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)", marginBottom: 2 }}>
            {article.title}
          </div>
          <div
            style={{
              fontSize: 13, color: "var(--mu)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {article.excerpt}
          </div>
        </div>
        <ChevronRight size={18} color="var(--mu)" style={{ flexShrink: 0 }} />
      </button>

      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px 12px", gap: 12,
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowWhyThis((v) => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: "var(--mu)", textDecoration: "underline",
              fontFamily: "system-ui, sans-serif", padding: 0,
            }}
          >
            Why this?
          </button>
          {showWhyThis && (
            <div
              style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                background: "var(--card)", border: "1px solid var(--bd)",
                borderRadius: 10, padding: "8px 12px", fontSize: 12,
                color: "var(--tx)", whiteSpace: "nowrap", zIndex: 5,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {triggerLabel}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, color: "var(--mu)", fontFamily: "system-ui, sans-serif",
            padding: 0,
          }}
        >
          Dismiss — don't show for a week
        </button>
      </div>
    </div>
  );
}
