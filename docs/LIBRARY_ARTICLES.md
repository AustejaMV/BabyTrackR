# Library articles — client vs backend

## Current setup (client-only)

All articles live in `src/app/data/articles.ts`. The app uses `getAllArticles()` and `getArticleById()` so the Library works **offline** and stays fast. There are 25 articles covering sleep, feeding, nappies, development, and mum's health, NHS-aligned and in plain English.

**Pros:** No backend, no latency, works offline, full control over content and tone.  
**Cons:** New or updated articles require an app release; bundle size grows if you add a lot more.

---

## Optional: backend for more / fresher articles

If you want many more articles or content that updates without app releases, you can add a backend layer.

### 1. Don’t “scour the net” blindly

Automatically scraping random sites is risky (copyright, quality, wrong tone). Prefer:

- **Curated sources:** NHS, health.gov, trusted charities (e.g. NCT, Lullaby Trust), or your own CMS.
- **RSS / APIs:** Many health bodies publish feeds or APIs; a scheduled job can poll and import into your DB.
- **Editorial pipeline:** Backend fetches or ingests from a fixed list of URLs/sources; content is normalised, optionally reviewed, then stored.

### 2. Suggested backend shape

- **Storage:** e.g. Supabase table `articles` with columns matching `ArticleContent` (id, title, body, excerpt, tags, lastReviewed, triggerConditions, ageRangeWeeks, etc.).
- **Scheduled job:** Supabase Edge Function (or similar) on a cron (e.g. daily/weekly) that:
  - Fetches from chosen RSS feeds or APIs,
  - Parses and maps to your article schema,
  - Upserts into `articles` (and maybe a “reviewed” flag so only approved items are visible).
- **API:** e.g. `GET /data/articles` (or `/articles`) that returns the list (and optionally `GET /data/articles/:id` for one). Same shape as `ArticleContent[]` so the app can swap the data source.

### 3. App-side integration

- On load (e.g. in `LibraryScreen` or a small data layer), call the new API.
- If the request succeeds, use that list for the Library (and optionally cache in memory or localStorage with a TTL).
- If the request fails or the user is offline, **fall back to the bundled client list** in `articles.ts` so the Library still works.

That way you get more and fresher articles when online, without losing offline behaviour or quality control.
