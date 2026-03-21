import { useState, useMemo } from "react";
import { Search, BookOpen, ChevronRight, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { getAllArticles } from "../data/articles";
import type { ArticleContent } from "../types/article";
import { useLanguage } from "../contexts/LanguageContext";

const CATEGORIES = ["All", "Sleep", "Feeding", "Nappies", "Development", "Mum's health"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABEL_KEYS: Record<Category, string> = {
  All: "library.categoryAll",
  Sleep: "library.categorySleep",
  Feeding: "library.categoryFeeding",
  Nappies: "library.categoryNappies",
  Development: "library.categoryDevelopment",
  "Mum's health": "library.categoryMumsHealth",
};

const TAG_TO_CATEGORY: Record<string, Category> = {
  sleep: "Sleep",
  naps: "Sleep",
  regression: "Sleep",
  SIDS: "Sleep",
  safety: "Sleep",
  feeding: "Feeding",
  breast: "Feeding",
  bottle: "Feeding",
  weaning: "Feeding",
  solids: "Feeding",
  nappy: "Nappies",
  nappies: "Nappies",
  poo: "Nappies",
  constipation: "Nappies",
  development: "Development",
  crying: "Development",
  milestones: "Development",
  mum: "Mum's health",
  wellbeing: "Mum's health",
  "mental health": "Mum's health",
};

function categoryFor(article: ArticleContent): Category {
  for (const tag of article.tags) {
    const cat = TAG_TO_CATEGORY[tag];
    if (cat) return cat;
  }
  return "Development";
}

const HEALTH_MARKER = "When to call your doctor or local health advice line";

function splitHealthSection(body: string): { main: string; health: string | null } {
  const idx = body.indexOf(HEALTH_MARKER);
  if (idx === -1) return { main: body, health: null };
  return {
    main: body.slice(0, idx).trimEnd(),
    health: body.slice(idx + HEALTH_MARKER.length).trim(),
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

/** Build Google Translate URL to translate English text into the given locale. Opens in new tab. */
function getGoogleTranslateUrl(text: string, targetLocale: string): string {
  if (targetLocale === "en") return "#";
  const tl = targetLocale;
  const encoded = encodeURIComponent(text.slice(0, 5000));
  return `https://translate.google.com/?sl=en&tl=${tl}&text=${encoded}`;
}

export function LibraryScreen() {
  const { t, language } = useLanguage();
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
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{t("library.title")}</h1>
      <p style={{ color: "var(--mu)", fontSize: 14, margin: "0 0 16px" }}>
        {t("library.subtitle")}
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
          placeholder={t("library.searchPlaceholder")}
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
              {t(CATEGORY_LABEL_KEYS[cat])}
            </button>
          );
        })}
      </div>

      {/* Article list */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--mu)" }}>
          <BookOpen size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <p style={{ margin: 0 }}>{t("library.noMatch")}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((article) => {
          const expanded = expandedId === article.id;
          const cat = categoryFor(article);
          const { main, health } = splitHealthSection(article.body);

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
                      {t(CATEGORY_LABEL_KEYS[cat])}
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

                  {health && (
                    <div
                      style={{
                        background: "var(--ro)",
                        borderRadius: 14,
                        padding: "14px 16px",
                        margin: "8px 0 12px",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "var(--tx)" }}>
                        {HEALTH_MARKER}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--tx)" }}>{renderParagraphs(health)}</div>
                    </div>
                  )}

                  {/* Translate with Google — when app language is not English */}
                  {language !== "en" && (
                    <div style={{ marginBottom: 12 }}>
                      <a
                        href={getGoogleTranslateUrl(`${article.title}\n\n${article.body}`, language)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          color: "var(--coral)",
                          fontWeight: 500,
                          textDecoration: "none",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={14} />
                        {t("library.translateWithGoogle")}
                      </a>
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
                      {t("library.lastReviewed", { date: article.lastReviewed })}
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--mu)" }}>{t("library.helpful")}</span>
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
                        aria-label={t("common.yes")}
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
                        aria-label={t("common.no")}
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
