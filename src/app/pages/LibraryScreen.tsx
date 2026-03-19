import { useState, useMemo } from "react";
import { Search, BookOpen, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { getAllArticles } from "../data/articles";
import type { ArticleContent } from "../types/article";

const CATEGORIES = ["All", "Sleep", "Feeding", "Nappies", "Development", "Mum's health"] as const;
type Category = (typeof CATEGORIES)[number];

const TAG_TO_CATEGORY: Record<string, Category> = {
  sleep: "Sleep",
  naps: "Sleep",
  regression: "Sleep",
  SIDS: "Sleep",
  safety: "Sleep",
  feeding: "Feeding",
  nappy: "Nappies",
  poo: "Nappies",
  constipation: "Nappies",
  development: "Development",
  crying: "Development",
  mum: "Mum's health",
  wellbeing: "Mum's health",
};

function categoryFor(article: ArticleContent): Category {
  for (const tag of article.tags) {
    const cat = TAG_TO_CATEGORY[tag];
    if (cat) return cat;
  }
  return "Development";
}

const GP_MARKER = "When to call your GP or 111";

function splitGPSection(body: string): { main: string; gp: string | null } {
  const idx = body.indexOf(GP_MARKER);
  if (idx === -1) return { main: body, gp: null };
  return {
    main: body.slice(0, idx).trimEnd(),
    gp: body.slice(idx + GP_MARKER.length).trim(),
  };
}

function renderParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p, i) => (
      <p key={i} style={{ margin: "0 0 12px", lineHeight: 1.6 }}>
        {p.trim()}
      </p>
    ));
}

export function LibraryScreen() {
  const articles = useMemo(() => getAllArticles(), []);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [helpful, setHelpful] = useState<Record<string, "yes" | "no">>({});

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return articles.filter((a) => {
      if (q && !a.title.toLowerCase().includes(q)) return false;
      if (activeCategory !== "All" && categoryFor(a) !== activeCategory) return false;
      return true;
    });
  }, [articles, query, activeCategory]);

  return (
    <div style={{ padding: "16px 16px 100px", fontFamily: "system-ui, sans-serif", color: "var(--tx)" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Knowledge Library</h1>
      <p style={{ color: "var(--mu)", fontSize: 14, margin: "0 0 16px" }}>
        NHS-aligned articles reviewed by health professionals
      </p>

      {/* Search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--card)",
          border: "1px solid var(--bd)",
          borderRadius: 14,
          padding: "10px 14px",
          marginBottom: 12,
        }}
      >
        <Search size={18} color="var(--mu)" />
        <input
          type="text"
          placeholder="Search articles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            flex: 1,
            fontSize: 15,
            color: "var(--tx)",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 14,
          scrollbarWidth: "none",
        }}
      >
        {CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 20,
                border: active ? "none" : "1px solid var(--bd)",
                background: active ? "var(--coral)" : "var(--card)",
                color: active ? "#fff" : "var(--tx)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Article list */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--mu)" }}>
          <BookOpen size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No articles match your search.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((article) => {
          const expanded = expandedId === article.id;
          const cat = categoryFor(article);
          const { main, gp } = splitGPSection(article.body);

          return (
            <div
              key={article.id}
              style={{
                background: "var(--card)",
                borderRadius: 14,
                border: "1px solid var(--bd)",
                overflow: "hidden",
              }}
            >
              {/* Card header — always visible */}
              <button
                onClick={() => setExpandedId(expanded ? null : article.id)}
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
                  fontFamily: "inherit",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "var(--pe)",
                        color: "var(--coral)",
                      }}
                    >
                      {cat}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)", marginBottom: 2 }}>
                    {article.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--mu)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {article.excerpt}
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  color="var(--mu)"
                  style={{
                    flexShrink: 0,
                    transition: "transform 0.2s",
                    transform: expanded ? "rotate(90deg)" : "none",
                  }}
                />
              </button>

              {/* Expanded content */}
              {expanded && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    borderTop: "1px solid var(--bd)",
                    marginTop: -1,
                  }}
                >
                  <div style={{ paddingTop: 14, fontSize: 14, color: "var(--tx)" }}>
                    {renderParagraphs(main)}
                  </div>

                  {gp && (
                    <div
                      style={{
                        background: "var(--ro)",
                        borderRadius: 14,
                        padding: "14px 16px",
                        margin: "8px 0 12px",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "var(--tx)" }}>
                        {GP_MARKER}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--tx)" }}>{renderParagraphs(gp)}</div>
                    </div>
                  )}

                  {/* Footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 10,
                      borderTop: "1px solid var(--bd)",
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--mu)" }}>
                      Last reviewed {article.lastReviewed}
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--mu)" }}>Helpful?</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHelpful((h) => ({ ...h, [article.id]: "yes" }));
                        }}
                        style={{
                          background: helpful[article.id] === "yes" ? "var(--pe)" : "transparent",
                          border: "1px solid var(--bd)",
                          borderRadius: 8,
                          padding: "4px 8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                        aria-label="Yes, helpful"
                      >
                        <ThumbsUp size={14} color={helpful[article.id] === "yes" ? "var(--coral)" : "var(--mu)"} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHelpful((h) => ({ ...h, [article.id]: "no" }));
                        }}
                        style={{
                          background: helpful[article.id] === "no" ? "var(--pe)" : "transparent",
                          border: "1px solid var(--bd)",
                          borderRadius: 8,
                          padding: "4px 8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                        aria-label="No, not helpful"
                      >
                        <ThumbsDown size={14} color={helpful[article.id] === "no" ? "var(--coral)" : "var(--mu)"} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
