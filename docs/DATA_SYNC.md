# How data is stored and shared

## Short answer

- **Data is saved to Supabase** via the Edge Function. It’s stored in the `kv_store_71db3e83` table, keyed by **family**. Everyone in the same family shares the same data.
- **localStorage** is used as a **local cache**: the app reads/writes there for speed, and syncs to the server when you’re logged in.

## Flow

1. **On app load (Dashboard)**  
   When you open the app and land on the Dashboard, it calls `loadAllDataFromServer()`. That fetches all data for **your family** from the backend (Supabase KV table) and writes it into localStorage. So you see the latest shared data.

2. **When you change something**  
   When code calls `saveData(key, value, accessToken)` it:
   - Writes to **localStorage** (so the UI updates immediately),
   - Then POSTs to the Edge Function `/data/save`, which stores the value in Supabase under `data:{familyId}:{key}`.

3. **Sharing between users**  
   All users in the **same family** have the same `familyId`. The backend always reads/writes by `familyId`, so:
   - Parent A logs a feeding → it’s saved to `data:{familyId}:feedingHistory` in Supabase.
   - Parent B opens the app → Dashboard loads `data/all` for that familyId → their localStorage is filled with the same feedingHistory (and everything else) → they see Parent A’s feeding.

So data **is** in Supabase and **is** shared by family; localStorage is just the cache that gets filled from Supabase on load and updated locally + synced back on save.

## What gets synced

- **Synced to Supabase (when logged in):**  
  `feedingHistory`, `sleepHistory`, `notes`, and (after the fixes below) `diaperHistory`, `painkillerHistory`, `tummyTimeHistory`, and `feedingInterval`.

- **Loaded from Supabase on Dashboard:**  
  All of the above, plus `currentSleep`, `currentTummyTime` if you want them shared (optional).

- **“Last write wins”:**  
  There is no merge logic. Whoever saves last overwrites that key for the whole family. So if two people edit the same list at the same time offline, the last sync wins.

- **Family ID cache:**  
  The app caches `familyId` in localStorage (per user) so that when you reload, you still “have” your family even if the backend didn’t persist it (e.g. in-memory Edge Function). That way you don’t get a new family on every reload until you send an invite. For real persistence and sharing, the Edge Function must use the DB-backed KV table (see `docs/SUPABASE_SETUP.md`).
