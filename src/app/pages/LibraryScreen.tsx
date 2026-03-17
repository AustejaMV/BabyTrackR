/**
 * Library: browse all knowledge base articles by category with search.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router";
import { ChevronLeft, Search } from "lucide-react";
import { getAllArticles } from "../data/articles";
import { loadArticle } from "../utils/articleLoader";
import { ArticleModal } from "../components/ArticleModal";
import type { ArticleContent } from "../types/article";

const CATEGORY_LABELS: Record<string, string> = {
  sleep: "Sleep",
  feeding: "Feeding",
  nappy: "Nappies",
  regression: "Development",
  safety: "Safety",
  poo: "Nappies",
  SIDS: "Safety",
  constipation: "Nappies",
  crying: "Development",
  naps: "Sleep",
};

function getCategory(tags: string[]): string {
  for (const tag of tags) {
    const label = CATEGORY_LABELS[tag.toLowerCase()];
    if (label) return label;
  }
  return "General";
}

export function LibraryScreen() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const articles = useMemo(() => getAllArticles(), []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q));
  }, [articles, search]);

  const byCategory = useMemo(() => {
    const map = new Map<string, ArticleContent[]>();
    for (const a of filtered) {
      const cat = getCategory(a.tags);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(a);
    }
    const order = ["Sleep", "Feeding", "Nappies", "Safety", "Development", "General"];
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [filtered]);

  const selectedArticle = selectedId ? loadArticle(selectedId) : null;

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3" style={{ background: "var(--bg)", borderColor: "var(--bd)" }}>
        <Link to="/more" className="p-2 -ml-2 rounded-full" aria-label="Back to More">
          <ChevronLeft className="w-5 h-5" style={{ color: "var(--tx)" }} />
        </Link>
        <h1 className="text-lg font-semibold flex-1" style={{ color: "var(--tx)" }}>
          Library
        </h1>
      </header>

      <div className="px-4 py-3">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--mu)" }} aria-hidden />
          <input
            type="search"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-[14px]"
            style={{ background: "var(--card)", borderColor: "var(--bd)", color: "var(--tx)" }}
            aria-label="Search articles"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>
            No articles match your search.
          </p>
        ) : (
          <div className="space-y-6">
            {byCategory.map(([category, list]) => (
              <section key={category} aria-labelledby={`cat-${category}`}>
                <h2 id={`cat-${category}`} className="text-[13px] font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--mu)" }}>
                  {category}
                </h2>
                <ul className="space-y-2">
                  {list.map((article) => (
                    <li key={article.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(article.id)}
                        className="w-full text-left rounded-xl border p-3 block transition-opacity hover:opacity-90"
                        style={{ background: "var(--card)", borderColor: "var(--bd)", color: "var(--tx)" }}
                      >
                        <span className="text-[14px] font-medium">{article.title}</span>
                        <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: "var(--mu)" }}>
                          {article.excerpt}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
