
  # BabyTrackR

  This is a code bundle for BabyTrackR. The original project is available at https://www.figma.com/design/vmMQeSNjcXlJeUwX2HuCV0/BabyTrackR.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server. The app will be at **http://localhost:5173** (or the next free port). You can test everything locally without pushing to the server: all core tracking (feeding, sleep, diapers, tummy time, milestones, baby profile) works offline and persists in `localStorage`. Sign-in and sync are optional.

  ### Testing locally with the backend (optional)

  To run the Supabase Edge Function locally so sync works without deploying:

  1. Install [Supabase CLI](https://supabase.com/docs/guides/cli) and start the local stack: `supabase start`.
  2. Copy `.env.example` to `.env.local` and set `VITE_SERVER_URL=http://localhost:54321/functions/v1/server` (and, for the function, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `supabase status`).
  3. Run the function: `supabase functions serve server --env-file .env.local`.
  4. Run the app: `npm run dev`. The app will use the local function when `VITE_SERVER_URL` is set.

  ## Tests

  Run `npm test` to run the test suite. New features (baby age, targets, milestones, duration picker, synced keys) are covered by unit tests and server-side validation.
  