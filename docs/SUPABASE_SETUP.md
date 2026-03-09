# BabyTracker – Supabase setup (step-by-step)

Follow these steps so the app can create families, store invites, and sync data in Supabase.

---

## 1. Create a Supabase project (if you don’t have one)

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Pick organization, name the project (e.g. BabyTracker), set a database password, choose region, then **Create new project**.
4. Wait for the project to be ready.

---

## 2. Create the KV table (where families and data are stored)

1. In the left sidebar, open **SQL Editor**.
2. Click **New query**.
3. Paste this and run it (Run / Ctrl+Enter):

```sql
CREATE TABLE IF NOT EXISTS kv_store_71db3e83 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
```

4. You should see “Success. No rows returned.”  
5. In the left sidebar, open **Table Editor** and confirm the table **kv_store_71db3e83** exists (columns: `key`, `value`).

---

## 3. Get your project URL and keys

1. In the left sidebar, open **Project Settings** (gear icon).
2. Go to **API**.
3. Note:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (used by the frontend)
   - **service_role** key (used only by the Edge Function – keep it secret)

---

## 4. Create the Edge Function and set secrets

1. In the left sidebar, open **Edge Functions**.
2. If you don’t have a function named **server**:
   - Click **Create a new function**.
   - Name it exactly: **server**.
   - Create it (you can leave the default code for now).
3. Open the **server** function.
4. Set **secrets** (so the function can talk to your project and the table):
   - In the function page, find **Secrets** / **Environment variables** (or go to **Project Settings → Edge Functions**).
   - Add:
     - **SUPABASE_URL** = your Project URL (e.g. `https://xxxxx.supabase.co`)
     - **SUPABASE_SERVICE_ROLE_KEY** = your service_role key from step 3
5. Save.

---

## 5. Deploy the server function code (from your repo)

You need both `index.tsx` and `kv_store.tsx` deployed so the function uses the table.

### Option A: Deploy with Supabase CLI (recommended)

1. Install Supabase CLI if needed:
   - **Windows (PowerShell):** `scoop install supabase` or see [docs](https://supabase.com/docs/guides/cli).
   - **Mac:** `brew install supabase/tap/supabase`.
2. Log in:
   ```bash
   supabase login
   ```
3. Link your project (use the project ref from the dashboard URL, e.g. `gmtqrtpqfmbkljagskfn`):
   ```bash
   cd path/to/BabyTracker
   supabase link --project-ref YOUR_PROJECT_REF
   ```
4. Deploy the server function:
   ```bash
   supabase functions deploy server
   ```
5. When prompted, set secrets if not already set:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service_role key

### Option B: Copy-paste in the Dashboard (single file)

If you can’t use the CLI and the Dashboard only allows one file:

1. In **Edge Functions**, open the **server** function.
2. You need the logic of both `index.tsx` and `kv_store.tsx` in one file. Use the **single-file** version from the repo (see below) that inlines the table read/write so it doesn’t import `kv_store.tsx`.
3. Replace the entire function body with that single-file code.
4. Save and deploy (or the dashboard may auto-save).

*(If you want, we can add a `server-single-file.ts` in the repo that you can paste.)*

---

## 6. Point the frontend at this project

Your app uses a Supabase project URL and the **anon** key.

1. Find where the app sets the project (e.g. `utils/supabase/info.tsx` or env vars) and set:
   - **Project URL** = same as in step 3 (Project URL).
   - **Anon key** = the **anon public** key from step 3 (not the service_role key).
2. Rebuild/restart the app so it uses this project.

---

## 7. Test the flow

1. Open the app and sign in (or sign up).
2. The app will:
   - Call **GET /family** → no family yet.
   - Call **GET /family/invites** → no invites.
   - Call **POST /family/create** → creates a family and links the user.
3. Refresh the page: **GET /family** should now return your family (no new create).
4. In Supabase **Table Editor**, open **kv_store_71db3e83**: you should see rows with keys like `user:xxx:family` and `family:family_xxx`.

---

## Checklist

| Step | What to do |
|------|------------|
| 1 | Create Supabase project |
| 2 | Run SQL to create table `kv_store_71db3e83` |
| 3 | Copy Project URL and anon + service_role keys |
| 4 | Create Edge Function **server** and set **SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY** |
| 5 | Deploy **server** (CLI: `supabase functions deploy server` with both `index.tsx` and `kv_store.tsx`) |
| 6 | Set frontend Project URL and anon key to the same project |
| 7 | Sign in, create family, refresh and check table |

---

## “Family null → create → family null again”

This happens when:

1. **GET /family** runs (e.g. on sign-in) → `{"family":null}`.
2. **POST /family/create** runs → `{"familyId":"family_..."}` (success).
3. **GET /family** runs again (e.g. from auth state change) → `{"family":null}` again.

So the second GET still sees no family. That usually means the Edge Function is **not using the database**: it’s using in-memory storage. Each request can hit a different instance, so the create is stored only in one instance’s memory and the next GET sees nothing.

**Fix:** Deploy the version that writes to the table (see “Nothing gets stored” below). After deploy, in **Table Editor → kv_store_71db3e83** you should see rows after creating a family (e.g. `user:...:family`, `family:family_...`).

The app was also updated so that if we already created a family in the same session, we don’t create a second one when `loadFamily` runs twice; the second run reuses the created family ID.

---

## “Nothing gets stored” / GET /family always returns `{"family":null}`

1. **You pasted code into the Dashboard**  
   The copy-paste version that uses **in-memory** storage does not write to the database. Use the **single-file version** that writes to the table instead:
   - In the repo, open **`supabase/functions/server/index-SINGLE-FILE-FOR-DASHBOARD.ts`**.
   - Copy its entire contents and paste that as your **server** Edge Function in the Dashboard. It uses the same `kv_store_71db3e83` table (no second file needed).

2. **Table missing**  
   In **SQL Editor** run:
   ```sql
   CREATE TABLE IF NOT EXISTS kv_store_71db3e83 (
     key TEXT NOT NULL PRIMARY KEY,
     value JSONB NOT NULL
   );
   ```
   Then in **Table Editor** confirm the table exists.

3. **Secrets not set**  
   Edge Function → **server** → **Secrets**: set **SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY**. Without these, the function cannot read/write the table.

4. **RLS blocking writes**  
   If Row Level Security (RLS) is enabled on `kv_store_71db3e83`, the **service_role** key normally bypasses it. If you use the anon key by mistake, writes will fail. Ensure the function uses **SUPABASE_SERVICE_ROLE_KEY**.

5. **Check the create response**  
   After signing in, in Network tab click the **create** request. If the response is **500** with `storage_failed` or an error message, the table write failed (table missing, RLS, or wrong secrets).

---

## Other troubleshooting

- **404 on /family or /family/create**  
  Path is fixed in code (strip `/functions/v1/server` or use `/server` base path). Redeploy the function so the latest code is live.

- **CORS errors**  
  The function sets CORS for your app origin. If you use a new URL (e.g. new domain), add it to `ALLOWED_ORIGINS` in the function and redeploy.

- **“Invalid token” / 401**  
  Frontend must send the Supabase auth JWT in the `Authorization: Bearer <access_token>` header. Check that the app is logged in and passes the session’s `access_token` to the fetch calls.
