   # Cradl — Complete Setup Guide

   > **Goal: a perfectly running app on web, Android, iOS, Apple Watch, and widgets.**
   >
   > Follow this guide from top to bottom. By the end, every feature will work.
   >
   > Last updated: 18 March 2026

   ---

   ## Table of Contents

   1. [Prerequisites](#1-prerequisites)
   2. [Install & Run Locally](#2-install--run-locally)
   3. [Environment Variables](#3-environment-variables)
   4. [Supabase Backend](#4-supabase-backend)
   5. [Google Authentication](#5-google-authentication)
   6. [Ask Cradl AI (OpenAI)](#6-ask-cradl-ai-openai)
   7. [Deploy the Web App](#7-deploy-the-web-app)
   8. [Android App](#8-android-app)
   9. [Android Home Screen Widget](#9-android-home-screen-widget)
   10. [iOS App](#10-ios-app)
   11. [iOS Home Screen Widget](#11-ios-home-screen-widget)
   12. [Apple Watch App](#12-apple-watch-app)
   13. [Push Notifications](#13-push-notifications)
   14. [Premium / RevenueCat / Ads](#14-premium--revenuecat--ads)
   15. [What Works Right Now vs What Needs You](#15-what-works-right-now-vs-what-needs-you)
   16. [Full Checklist](#16-full-checklist)
   17. [Troubleshooting](#17-troubleshooting)
   18. [npm Scripts Reference](#18-npm-scripts-reference)

   ---

   ## 1. Prerequisites

   Install these before you start:

   | Tool | Version | What for | Install |
   |------|---------|----------|---------|
   | **Node.js** | 20+ | Everything | [nodejs.org](https://nodejs.org) or `nvm install 20` |
   | **npm** | 10+ | Packages | Comes with Node |
   | **Git** | Any | Version control | [git-scm.com](https://git-scm.com) |
   | **Android Studio** | Ladybug+ | Android builds | [developer.android.com/studio](https://developer.android.com/studio) |
   | **Xcode** | 15+ | iOS/Watch/Widget (macOS only) | Mac App Store |
   | **Supabase CLI** | Latest | Edge Functions | `npm install -g supabase` |
   | **Java JDK** | 17+ | Android builds | Bundled with Android Studio |
   | **CocoaPods** | Latest | iOS dependencies (macOS) | `sudo gem install cocoapods` |

   ### Verify your setup

   ```powershell
   node --version    # v20+ 
   npm --version     # 10+
   java --version    # 17+
   supabase --version
   ```

   ---

   ## 2. Install & Run Locally

   ```bash
   # Clone (if needed)
   git clone <your-repo-url>
   cd BabyTracker

   # Install all dependencies
   npm install

   # Start dev server
   npm run dev
   # → Opens at http://localhost:5173

   # Run tests
   npm test
   ```

   The app works offline with local storage for all tracking features. No Supabase needed for basic usage. Sign-in, sync, Village, and AI require the backend (steps 4–6).

   ---

   ## 3. Environment Variables

   The app uses a `.env` file for configuration. A `.env` file already exists with your current Supabase credentials. Here's what each variable does:

   ### File: `.env` (root of project — already created for you)

   ```env
   # ─── Supabase (REQUIRED for login, sync, Village, AI) ─────
   VITE_SUPABASE_URL=https://gmtqrtpqfmbkljagskfn.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # ─── RevenueCat (REQUIRED for real in-app purchases on native) ─────
   # Uncomment and fill in after RevenueCat setup (step 14)
   # VITE_RC_IOS_KEY=appl_your_ios_api_key
   # VITE_RC_ANDROID_KEY=goog_your_android_api_key

   # ─── Optional: override Edge Function URL ─────
   # VITE_SERVER_URL=http://localhost:54321/functions/v1/server
   ```

   ### Where to find Supabase values

   1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   2. Select your project
   3. **Settings → API**
   4. Copy **Project URL** → `VITE_SUPABASE_URL`
   5. Copy **anon (public) key** → `VITE_SUPABASE_ANON_KEY`

   ### If you create a NEW Supabase project

   Update both values in `.env`, then restart the dev server (`npm run dev`). The old hardcoded fallbacks in `supabase.ts` still work if `.env` is missing, but `.env` always takes priority.

   > **Security note**: `.env` is git-ignored. The `anon` key is safe to have in the frontend — it's a public key with Row Level Security. Never put the `service_role` key in the frontend.

   ---

   ## 4. Supabase Backend

   This is the single most important setup step. It enables: login, family sync, Village, handoff cards, and AI.

   ### 4.1 Create the project (if you haven't already)

   1. Go to [supabase.com](https://supabase.com) → **New project**
   2. Pick a name (e.g., "cradl-prod"), choose a region close to your users
   3. **Set a strong database password** — save it somewhere safe
   4. Wait for the project to be created (~30 seconds)

   ### 4.2 Create the database table

   Go to **SQL Editor** (left sidebar) and run:

   ```sql
   -- This is the only table Cradl needs
   CREATE TABLE IF NOT EXISTS kv_store_71db3e83 (
   key   TEXT  NOT NULL PRIMARY KEY,
   value JSONB NOT NULL
   );

   -- Enable Row Level Security (required by Supabase)
   ALTER TABLE kv_store_71db3e83 ENABLE ROW LEVEL SECURITY;

   -- Allow the Edge Function (service_role) to read/write everything
   CREATE POLICY "service_role_all" ON kv_store_71db3e83
   FOR ALL
   USING (true)
   WITH CHECK (true);
   ```

   Click **Run** and verify it says "Success".

   ### 4.3 Deploy the Edge Function

   You have two options:

   #### Option A: Paste in the Supabase Dashboard (easiest)

   1. Go to **Edge Functions** in the sidebar
   2. Click **New function** → name it `server`
   3. Open the file `supabase/functions/server/index-SINGLE-FILE-FOR-DASHBOARD.ts` from your project in a text editor
   4. **Select all** the contents and **paste** it into the function editor, replacing everything
   5. Click **Deploy**

   #### Option B: Deploy via CLI

   ```bash
   # Login to Supabase
   supabase login

   # Link your local project to the remote one
   supabase link --project-ref YOUR_PROJECT_REF
   # (find YOUR_PROJECT_REF in your project URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF)

   # Deploy
   supabase functions deploy server
   ```

   > **IMPORTANT**: If using CLI, make sure `supabase/functions/server/index.ts` contains the content from `index-SINGLE-FILE-FOR-DASHBOARD.ts`. The single-file version has Village routes that the multi-file version doesn't.

   ### 4.4 Set Edge Function secrets

   Go to **Edge Functions → server → Secrets** and add:

   | Secret name | Value | Where to find it |
   |-------------|-------|-------------------|
   | `SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` | Settings → API → Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiI...` (long key) | Settings → API → `service_role` key (click "Reveal") |

   ### 4.5 Verify it works

   Open your browser to:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/server/health
   ```

   You should see:
   ```json
   {"status":"ok"}
   ```

   If you see a CORS or 404 error, the function didn't deploy correctly. Re-do step 4.3.

   ### 4.6 Update your `.env` (if using a new project)

   Edit `.env` in the project root:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

   Restart the dev server: `npm run dev`.

   ---

   ## 5. Google Authentication

   Google sign-in is already coded in the app. You need to enable it in Supabase:

   ### 5.1 Create Google OAuth credentials

   1. Go to [console.cloud.google.com](https://console.cloud.google.com)
   2. Create a new project (or select an existing one)
   3. Go to **APIs & Services → Credentials**
   4. Click **Create Credentials → OAuth client ID**
   5. Application type: **Web application**
   6. Name: `Cradl`
   7. **Authorized redirect URIs** — add:
      ```
      https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
      ```
   8. Click **Create**
   9. Note the **Client ID** and **Client Secret**

   ### 5.2 Configure in Supabase

   1. Go to your Supabase project → **Authentication → Providers**
   2. Find **Google** and toggle it **ON**
   3. Enter:
      - **Client ID**: from step 5.1
      - **Client Secret**: from step 5.1
   4. Click **Save**

   ### 5.3 Configure the OAuth consent screen

   Back in Google Cloud Console:
   1. Go to **APIs & Services → OAuth consent screen**
   2. Fill in:
      - App name: `Cradl`
      - User support email: your email
      - Authorized domains: add `supabase.co`
      - Developer contact: your email
   3. Click **Save and Continue**
   4. Scopes: add `email` and `profile`
   5. Test users: add your own email for testing
   6. Submit (leave in "Testing" mode for now — you can publish later)

   ### 5.4 Test it

   1. Run `npm run dev`
   2. Go to `/login`
   3. Click **Continue with Google**
   4. You should be redirected to Google, then back to the app, logged in

   > **Note**: Email/password sign-in works without any Google setup — it uses Supabase Auth directly.

   ---

   ## 6. Ask Cradl AI (OpenAI)

   The Ask Cradl feature works with mock responses by default. To enable real AI:

   ### 6.1 Get an OpenAI API key

   1. Go to [platform.openai.com](https://platform.openai.com)
   2. Sign up or log in
   3. Go to **API Keys** → **Create new secret key**
   4. Copy the key (starts with `sk-...`)

   ### 6.2 Add the secret to your Edge Function

   1. Go to Supabase Dashboard → **Edge Functions → server → Secrets**
   2. Add:
      - Name: `OPENAI_API_KEY`
      - Value: `sk-your-openai-key`

   ### 6.3 Redeploy the Edge Function

   The `/ask-cradl` endpoint is already in the single-file Edge Function. If you already deployed before adding this key, you don't need to redeploy — the function reads the key at runtime.

   ### 6.4 How it works

   - User asks a question → frontend calls `POST /ask-cradl` on the Edge Function
   - Edge Function sends it to OpenAI with a carefully crafted system prompt
   - Response includes an escalation level (`routine`, `monitor`, `urgent`)
   - If `OPENAI_API_KEY` is not set, the endpoint returns a helpful message explaining it
   - If the user is not signed in, the frontend falls back to mock responses
   - Daily limit: 10 questions per user per day (tracked server-side)

   ### 6.5 Cost

   `gpt-4o-mini` is cheap — roughly $0.001–0.003 per question. At 10 questions/day for 100 users, that's about $1–3/month.

   ---

   ## 7. Deploy the Web App

   ### Option A: Cloudflare Pages (recommended — free)

   1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create**
   2. Connect your GitHub/GitLab repo
   3. Build settings:
      - Build command: `npm run build`
      - Build output directory: `dist`
      - Node.js version: `20`
   4. **Environment variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same as your `.env`)
   5. Deploy

   ### Option B: Vercel

   1. Go to [vercel.com](https://vercel.com) → Import project
   2. Same build settings as above
   3. Add env vars in Vercel dashboard

   ### Option C: Netlify

   1. Same approach — connect repo, set build command and output dir
   2. Add env vars in Netlify dashboard

   ### SPA Routing

   - **Cloudflare Pages:** Do **not** use `/* /index.html 200` in `_redirects` — deploy validation rejects it (infinite loop / error 10021). With **no** top-level `404.html`, Pages already treats the site as an SPA and matches unknown paths to `/` ([docs](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering)). The repo’s `public/_redirects` is comments-only for this reason.
   - **Netlify:** The repo includes `netlify.toml` with a `/* → /index.html` rewrite (200).
   - **Vercel:** Handles SPA routing automatically.

   ### Custom domain

   All three hosts support custom domains. Point your domain's DNS to the host, then add it in the dashboard. For Cradl, something like `app.cradl.co`.

   ---

   ## 8. Android App

   ### 8.1 Build web assets and sync

   ```bash
   npm run build:android
   # This runs: vite build && cap sync android
   ```

   ### 8.2 Open in Android Studio

   ```bash
   npx cap open android
   ```

   Or open the `android/` folder directly in Android Studio.

   ### 8.3 First-time setup in Android Studio

   When Android Studio opens:

   1. **Wait for Gradle sync** to complete (bottom progress bar)
   2. If prompted to update Gradle or SDK, click **Update**
   3. Go to **File → Project Structure → Modules → app**:
      - **Min SDK**: 24 (already set)
      - **Target SDK**: 34+ (already set)

   ### 8.4 App icons

   Your Cradl icons are already copied to all `mipmap-*` directories. You should see the Cradl logo in:
   - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
   - `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
   - etc.

   To generate proper density-specific sizes from the 1024×1024 icon:
   1. In Android Studio: right-click `res` → **New → Image Asset**
   2. **Icon Type**: Launcher Icons (Adaptive and Legacy)
   3. **Foreground Layer → Path**: browse to `icons/app-icon-1024x1024.png`
   4. **Background Layer → Color**: `#FAF7F2`
   5. Click **Next → Finish**

   ### 8.5 Splash screen

   The splash uses `android/app/src/main/res/drawable/splash.png` (the Cradl mark on transparent background). The background color `#FAF7F2` is set in `capacitor.config.json`.

   ### 8.6 Run on device/emulator

   1. Connect an Android device (enable USB debugging) or start an emulator
   2. Click the **Run** button (green play) in Android Studio
   3. Or from terminal:
      ```bash
      npx cap run android
      ```

   ### 8.7 Build a release APK/AAB

   1. **Android Studio → Build → Generate Signed Bundle / APK**
   2. Choose **Android App Bundle** (AAB) for Play Store, or **APK** for direct distribution
   3. Create or select a keystore:
      - **New key store**: click **Create new...**
      - Pick a location, set passwords, fill in the certificate details
      - **Save this keystore file and passwords** — you'll need them for every future release
   4. Select build variant: **release**
   5. Click **Finish**

   The signed AAB will be at `android/app/release/app-release.aab`.

   ### 8.8 Publish to Play Store

   1. Go to [play.google.com/console](https://play.google.com/console)
   2. Create a developer account ($25 one-time fee)
   3. **Create app** → fill in details
   4. Upload your AAB to **Production → Create new release**
   5. Fill in:
      - App description, screenshots (phone + 7" tablet + 10" tablet)
      - Privacy policy URL
      - Content rating questionnaire
      - Target audience and content
   6. Submit for review (takes 1–7 days)

   ---

   ## 9. Android Home Screen Widget

   The widget is **fully built and registered**. Once you install the Android app:

   1. Long-press your home screen
   2. Tap **Widgets**
   3. Find **Cradl** and drag it to the home screen
   4. The widget shows last feed, sleep, and nappy times, with quick-log buttons

   ### How data flows

   App → `Dashboard.tsx` calls `syncWidgetData()` → writes to Android SharedPreferences → `CradlWidget.java` reads and displays → auto-refreshes every 30 minutes.

   **Nothing to configure** — it works automatically.

   ---

   ## 10. iOS App

   > **Requires macOS with Xcode 15+**

   ### 10.1 Build and sync

   ```bash
   npm run build:ios
   # This runs: vite build && cap sync ios
   ```

   ### 10.2 Open in Xcode

   ```bash
   npx cap open ios
   ```

   ### 10.3 First-time setup in Xcode

   1. Select the **App** target in the left sidebar
   2. **Signing & Capabilities**:
      - Select your **Team** (Apple Developer account)
      - Enable **Automatically manage signing**
      - **Bundle Identifier**: `com.cradl.app`
   3. **General**:
      - **Deployment Target**: iOS 14.0 (or your preference)
   4. **Info** tab — verify these usage descriptions exist (they should already):

      | Key | Value |
      |-----|-------|
      | `NSMicrophoneUsageDescription` | Cradl uses your microphone to let you ask questions by voice |
      | `NSLocationWhenInUseUsageDescription` | Cradl uses your location to find other parents nearby during night feeds |
      | `NSCameraUsageDescription` | Cradl uses your camera to add photos to your baby's profile and memory book |
      | `NSSpeechRecognitionUsageDescription` | Cradl uses speech recognition so you can ask questions hands-free |

      If any are missing, add them in **Info** tab → click **+**.

   ### 10.4 App icons

   Already replaced with the Cradl icon in `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`. Xcode should show the correct icon.

   ### 10.5 App Groups (needed for widget)

   1. Select the **App** target
   2. **Signing & Capabilities → + Capability → App Groups**
   3. Click **+** and add: `group.com.cradl.app`

   ### 10.6 URL Scheme (needed for widget deep links)

   1. Select the **App** target → **Info** tab
   2. Scroll to **URL Types**
   3. Click **+** and add:
      - **Identifier**: `com.cradl.app`
      - **URL Schemes**: `cradl`
      - **Role**: Editor

   ### 10.7 Run on device/simulator

   1. Select your device or simulator from the top bar
   2. **Product → Run** (Cmd+R)

   ### 10.8 Build for App Store

   1. Select **Any iOS Device** as the build target
   2. **Product → Archive**
   3. When the archive appears in the Organizer, click **Distribute App**
   4. Choose **App Store Connect** → **Upload**
   5. Follow the prompts

   ### 10.9 Publish to App Store

   1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   2. **My Apps → +** → New App
   3. Fill in:
      - Name: Cradl
      - Bundle ID: `com.cradl.app`
      - SKU: `cradl-app`
   4. Under **App Information**: fill privacy policy, category (Health & Fitness or Lifestyle)
   5. Under **Prepare for Submission**: add screenshots, description, keywords
   6. Select your uploaded build
   7. Submit for review (takes 1–3 days)

   ---

   ## 11. iOS Home Screen Widget

   ### 11.1 Add the widget extension target

   1. In Xcode: **File → New → Target**
   2. Search for **Widget Extension**
   3. Name: `CradlWidget`
   4. **Uncheck** "Include Configuration App Intent" / "Include Configuration Intent"
   5. Click **Finish**
   6. If asked to activate the scheme, click **Activate**

   ### 11.2 Replace the generated files

   Xcode creates boilerplate files. Replace them:

   1. In the **CradlWidget** folder in the Project Navigator, **delete** the generated `.swift` file(s) (Move to Trash)
   2. Right-click the **CradlWidget** folder → **Add Files to "App"**
   3. Navigate to `ios/CradlWidget/` and select:
      - `CradlWidget.swift`
      - `Info.plist`
      - `Assets.xcassets` (the whole folder)
   4. Make sure **Target Membership** is checked for `CradlWidget`

   ### 11.3 Enable App Groups on the widget

   1. Select the **CradlWidget** target
   2. **Signing & Capabilities → + Capability → App Groups**
   3. Add `group.com.cradl.app` (must match the main app)

   ### 11.4 Test it

   1. Build and run the main app on a simulator
   2. Go to the home screen, long-press → tap the **+** in the top-left
   3. Search for **Cradl** → add the widget (Small or Medium)

   ---

   ## 12. Apple Watch App

   ### 12.1 Add the watchOS target

   1. In Xcode: **File → New → Target**
   2. Search for **watchOS App**
   3. Name: `CradlWatch`
   4. Interface: **SwiftUI**
   5. Lifecycle: **SwiftUI App**
   6. **Uncheck** Include Tests
   7. Click **Finish**

   ### 12.2 Replace the generated files

   1. Delete the generated `.swift` files in the CradlWatch target
   2. Right-click → **Add Files to "App"**
   3. Navigate to `ios/CradlWatch Watch App/` and add:
      - `CradlWatchApp.swift`
      - `ContentView.swift`
      - `WatchDataStore.swift`
      - `Info.plist`
      - `Assets.xcassets` (the whole folder)
   4. Check **Target Membership** for `CradlWatch Watch App`

   ### 12.3 Enable App Groups

   Same `group.com.cradl.app` on the watch app target.

   ### 12.4 Add WatchConnectivity handler to the main iOS app

   The watch app sends messages to the iPhone. You need a handler in the main app.

   Create a new Swift file `ios/App/App/WatchSessionManager.swift`:

   ```swift
   import WatchConnectivity
   import UIKit

   class WatchSessionManager: NSObject, WCSessionDelegate {
      static let shared = WatchSessionManager()

      func activate() {
         if WCSession.isSupported() {
               WCSession.default.delegate = self
               WCSession.default.activate()
         }
      }

      func session(_ session: WCSession, didReceiveMessage message: [String: Any],
                  replyHandler: @escaping ([String: Any]) -> Void) {
         if let action = message["action"] as? String {
               DispatchQueue.main.async {
                  if let url = URL(string: "cradl://action/\(action)") {
                     UIApplication.shared.open(url)
                  }
               }
               replyHandler(["message": "\(action.capitalized) logged!"])
         }
      }

      func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}
      func sessionDidBecomeInactive(_ session: WCSession) {}
      func sessionDidDeactivate(_ session: WCSession) { WCSession.default.activate() }
   }
   ```

   Then, in `ios/App/App/AppDelegate.swift`, add to `application(_:didFinishLaunchingWithOptions:)`:

   ```swift
   WatchSessionManager.shared.activate()
   ```

   ### 12.5 Test

   1. In Xcode, select the **CradlWatch Watch App** scheme
   2. Select an Apple Watch simulator paired with an iPhone simulator
   3. Run

   ---

   ## 13. Push Notifications

   ### 13.1 Android (Firebase Cloud Messaging)

   1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   2. Click **Add project** → name it "Cradl" → disable Google Analytics (optional) → Create
   3. Click the **Android** icon → Register app:
      - Package name: `com.cradl.app`
      - App nickname: Cradl
   4. Download `google-services.json`
   5. Copy it to `android/app/google-services.json`
   6. That's it! The `build.gradle` already conditionally applies the Google Services plugin when this file exists.

   Rebuild the Android app:
   ```bash
   npm run build:android
   npx cap open android
   ```

   ### 13.2 iOS (APNs)

   1. Go to [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles**
   2. Go to **Keys** → click **+**
   3. Name: `Cradl Push`
   4. Check **Apple Push Notifications service (APNs)**
   5. Click **Continue → Register**
   6. **Download** the `.p8` key file (save it safely — you can only download it once)
   7. Note the **Key ID** and your **Team ID** (shown on the main account page)

   In Xcode:
   1. Select the **App** target
   2. **Signing & Capabilities → + Capability → Push Notifications**

   If using Firebase for push:
   1. Go to Firebase Console → Project Settings → Cloud Messaging
   2. Under **Apple app configuration**, upload the `.p8` key with Key ID and Team ID

   ### 13.3 Web Push (PWA)

   The `vite-plugin-pwa` is already configured and will generate a service worker on build. The app will be installable from Chrome/Edge as a PWA. Web push notifications use the browser's Notification API (already coded in `notifications.ts`).

   ### 13.4 Local care reminders (feeds, naps, nappies)

   Scheduled in **`careNotifications.ts`** using **`@capacitor/local-notifications`** on **iOS/Android** (after `npx cap sync`) and **in-app `setTimeout` + `Notification`** on **web**.

   - **Native:** reminders are stored by the OS and can fire in the background. Ensure notification permission is granted on first use.
   - **Web:** timers only run while a tab with the app is open; closing the tab clears them. For reliable background alerts on web you’d need push or a service-worker cron pattern later.

   Toggles and defaults live in **`notificationSettingsStorage.ts`**. Logic blends recent logs with age-based caps in **`careNotificationPlanner.ts`** (informational only, not medical advice).

   ---

   ## 14. Premium / RevenueCat / Ads

   ### 14.1 How premium works right now

   | Feature | Status |
   |---------|--------|
   | Premium page (`/premium`) | ✅ Working |
   | "Watch a video" → 7-day unlock | ✅ Working (instant, no real ad) |
   | Testing flag in Settings | ✅ Working (`localStorage`) |
   | RevenueCat integration | ✅ Coded, needs API keys |
   | Real subscriptions | Needs RevenueCat + store products |
   | Real rewarded ads | Needs AdMob setup |

   ### 14.2 Set up RevenueCat (real subscriptions)

   #### Create the account and products

   1. Go to [revenuecat.com](https://revenuecat.com) → **Sign up** (free tier available)
   2. Create a new project called **Cradl**

   #### Create products in the stores

   **App Store Connect** (iOS):
   1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → your app
   2. **Subscriptions → +** → Create a Subscription Group called "Cradl PRO"
   3. Add products:
      - `com.cradl.app.pro.monthly` — Monthly, £3.99
      - `com.cradl.app.pro.annual` — Annual, £29.99
   4. Add a non-renewing subscription or non-consumable for lifetime:
      - `com.cradl.app.pro.lifetime` — £59.99

   **Google Play Console** (Android):
   1. Go to [play.google.com/console](https://play.google.com/console) → your app
   2. **Monetize → Products → Subscriptions**
   3. Create the same three products with matching IDs

   #### Connect stores to RevenueCat

   1. In RevenueCat → **Project → Apps**
   2. Add an **Apple App Store** app:
      - Bundle ID: `com.cradl.app`
      - Shared Secret: from App Store Connect → App → App Information → App-Specific Shared Secret (click Manage)
   3. Add a **Google Play Store** app:
      - Package name: `com.cradl.app`
      - Upload your Google service account JSON key (Play Console → API Access)

   #### Configure entitlements

   1. In RevenueCat → **Entitlements → +**
   2. Name: `premium`, Identifier: `premium`
   3. Attach all three products to this entitlement

   #### Configure offerings

   1. In RevenueCat → **Offerings → Default**
   2. Add the three packages (Monthly, Annual, Lifetime)

   #### Get your API keys

   1. **API Keys** → find the **Public app-specific** keys:
      - iOS key: starts with `appl_`
      - Android key: starts with `goog_`

   #### Add keys to your `.env`

   ```env
   VITE_RC_IOS_KEY=appl_your_ios_key_here
   VITE_RC_ANDROID_KEY=goog_your_android_key_here
   ```

   The `PremiumContext.tsx` will automatically initialize RevenueCat on native platforms using these keys.

   ### 14.3 Set up rewarded ads (AdMob)

   1. Go to [admob.google.com](https://admob.google.com) → create an account
   2. Add your app (iOS and Android)
   3. Create a **Rewarded** ad unit for each platform
   4. Install the AdMob plugin:
      ```bash
      npm install @capacitor-community/admob
      npx cap sync
      ```
   5. In `PremiumScreen.tsx`, update the "Watch a short video" handler:
      ```typescript
      import { AdMob, RewardAdPluginEvents } from "@capacitor-community/admob";

      const handleAdReward = async () => {
      await AdMob.initialize();
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
         unlockViaAd(); // grants 7-day premium
      });
      await AdMob.showRewardVideoAd({ adId: "YOUR_AD_UNIT_ID" });
      };
      ```

   ### 14.4 Grant premium for free (no purchase)

   #### Method 1: RevenueCat Dashboard (one-off)

   1. [app.revenuecat.com](https://app.revenuecat.com) → **Customers**
   2. Search for the user by their **App User ID** (this is the Supabase `user.id`)
   3. Click user → **Grant Promotional Entitlement**
   4. Select `premium` entitlement
   5. Choose duration: **Lifetime** or a specific end date
   6. Click **Grant**

   #### Method 2: RevenueCat REST API (bulk/automation)

   ```bash
   curl -X POST "https://api.revenuecat.com/v1/subscribers/USER_ID/entitlements/premium/promotional" \
   -H "Authorization: Bearer YOUR_REVENUECAT_SECRET_API_KEY" \
   -H "Content-Type: application/json" \
   -d '{"duration": "lifetime"}'
   ```

   Durations: `daily`, `three_day`, `weekly`, `monthly`, `two_month`, `three_month`, `six_month`, `yearly`, `lifetime`.

   **Secret API key**: RevenueCat Dashboard → Project Settings → API Keys → **Secret API key** (not the public one).

   **User ID**: The Supabase `user.id`. Find it in Supabase Dashboard → Authentication → Users.

   #### Method 3: Store promo codes

   - **Apple**: App Store Connect → Features → Promo Codes. Up to 100 per app version.
   - **Google**: Play Console → Monetize → Products → Subscriptions → Create promotion.

   #### Method 4: Testing

   - **Sandbox** (iOS): Use a sandbox Apple ID. All purchases are free.
   - **License testing** (Android): Play Console → Settings → License testing → add tester emails. All purchases are free.

   ### 14.5 Testing premium without RevenueCat

   For local testing, go to **Settings → scroll to bottom** and toggle the "Premium testing" switch. This sets `localStorage` to activate premium features instantly.

   ---

   ## 15. What Works Right Now vs What Needs You

   ### Works immediately (zero setup)

   | Feature | Notes |
   |---------|-------|
   | All baby tracking (feed, sleep, nappy, tummy, bottle, pump) | Local storage |
   | Custom trackers | Local storage |
   | Dashboard with stats, timeline, warnings | Local storage |
   | Story tab (growth, milestones, narrative, leaps) | Local storage |
   | Me tab (mood, sleep, recovery, relationship check-in) | Local storage |
   | Ask Cradl AI (mock responses + microphone) | Falls back to mock |
   | Premium page and ad reward flow | Instant 7-day unlock |
   | Settings, data export (PDF/CSV) | Local storage |
   | GP visit prep, handoff card, return to work planner | Local storage |
   | Desktop responsive 3-column layout | Browser |
   | Column resizing (persisted) | Local storage |
   | Onboarding flow | Local storage |
   | Theme toggle (dark/light) | Local storage |
   | PWA service worker | Auto-generated on build |

   ### Works after Supabase setup (step 4)

   | Feature | What you get |
   |---------|-------------|
   | Email/password sign-in | Supabase Auth |
   | Google sign-in | + Step 5 |
   | Family data sync across devices | Edge Function |
   | Village (groups, Q&A, places, night companion) | Edge Function |
   | Handoff card (shareable via link) | Edge Function |

   ### Works after OpenAI setup (step 6)

   | Feature | What you get |
   |---------|-------------|
   | Real AI answers in Ask Cradl | Evidence-based, age-aware |
   | Escalation detection | Urgent/monitor/routine |

   ### Works after native build (steps 8–12)

   | Feature | What you get |
   |---------|-------------|
   | Android app | Play Store ready |
   | Android widget | Auto data sync |
   | iOS app | App Store ready |
   | iOS widget | WidgetKit |
   | Apple Watch app | WatchConnectivity |

   ### Works after RevenueCat setup (step 14)

   | Feature | What you get |
   |---------|-------------|
   | Real in-app purchases | Monthly/Annual/Lifetime |
   | Subscription management | RevenueCat handles renewals, refunds |

   ---

   ## 16. Full Checklist

   Copy this and check off as you go:

   ```
   ── Basics ──
   [ ] npm install
   [ ] npm run dev → app loads at localhost:5173
   [ ] npm test → all tests pass

   ── Supabase ──
   [ ] Create Supabase project (or use existing one)
   [ ] Run SQL to create kv_store_71db3e83 table
   [ ] Deploy Edge Function (paste index-SINGLE-FILE-FOR-DASHBOARD.ts)
   [ ] Set SUPABASE_URL secret in Edge Function
   [ ] Set SUPABASE_SERVICE_ROLE_KEY secret in Edge Function
   [ ] Verify: visit /functions/v1/server/health → {"status":"ok"}
   [ ] .env has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

   ── Authentication ──
   [ ] Test email/password sign-up and sign-in
   [ ] (Optional) Set up Google OAuth (step 5)
   [ ] Test Google sign-in

   ── AI ──
   [ ] (Optional) Get OpenAI API key
   [ ] Set OPENAI_API_KEY secret in Edge Function
   [ ] Test Ask Cradl with a real question

   ── Android ──
   [ ] npm run build:android
   [ ] Open in Android Studio (npx cap open android)
   [ ] Generate adaptive icon via Image Asset wizard
   [ ] Run on device/emulator
   [ ] Test widget (long-press home → Widgets → Cradl)
   [ ] (Optional) Set up Firebase + google-services.json for push
   [ ] Build signed AAB for Play Store

   ── iOS (macOS required) ──
   [ ] npm run build:ios
   [ ] Open in Xcode (npx cap open ios)
   [ ] Set team and signing
   [ ] Add App Group: group.com.cradl.app
   [ ] Add URL Scheme: cradl
   [ ] Verify Info.plist usage descriptions
   [ ] Run on device/simulator
   [ ] Add Widget Extension target (step 11)
   [ ] Add watchOS target (step 12)
   [ ] Add WatchSessionManager.swift
   [ ] Test widget and watch app
   [ ] (Optional) Set up APNs key for push
   [ ] Archive and upload to App Store Connect

   ── Premium ──
   [ ] (Optional) Create RevenueCat account
   [ ] (Optional) Create store products
   [ ] (Optional) Add VITE_RC_IOS_KEY and VITE_RC_ANDROID_KEY to .env
   [ ] Test premium toggle in Settings (works without RevenueCat)

   ── Deploy ──
   [ ] npm run build → deploy dist/ to Cloudflare/Vercel/Netlify
   [ ] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in host env vars
   [ ] Test deployed URL
   [ ] (Optional) Submit to Play Store
   [ ] (Optional) Submit to App Store
   ```

   ---

   ## 17. Troubleshooting

   ### "Family is null" or sync doesn't work

   - Make sure you deployed `index-SINGLE-FILE-FOR-DASHBOARD.ts`, NOT `index.tsx`
   - Check the Edge Function logs in Supabase Dashboard → Edge Functions → server → Logs
   - Verify the `kv_store_71db3e83` table exists

   ### Google sign-in doesn't redirect back

   - Check the redirect URI matches exactly: `https://YOUR_REF.supabase.co/auth/v1/callback`
   - Make sure `supabase.co` is in your OAuth consent screen's authorized domains

   ### Android build fails

   - Make sure Java 17+ is installed: `java --version`
   - In Android Studio: **File → Invalidate Caches** then restart
   - Try: `npx cap sync android` then build again

   ### iOS build fails with signing errors

   - Make sure you have an Apple Developer account ($99/year)
   - In Xcode: select your team under Signing & Capabilities
   - Try: **Product → Clean Build Folder** (Shift+Cmd+K)

   ### Widget shows default data

   - Log something in the app first (feed, sleep, or nappy)
   - The widget updates every 30 minutes, or when you return to the app

   ### Ask Cradl returns mock responses while logged in

   - Check that `OPENAI_API_KEY` is set in your Edge Function secrets
   - Check Edge Function logs for errors
   - The frontend falls back to mock if the API call fails

   ### PWA doesn't install

   - Build with `npm run build` (service worker is only generated in production builds)
   - Serve with HTTPS (required for service workers)
   - Check Chrome DevTools → Application → Service Workers

   ---

   ## 18. npm Scripts Reference

   | Script | What it does |
   |--------|-------------|
   | `npm run dev` | Start Vite dev server (hot reload) |
   | `npm run build` | Production build → `dist/` |
   | `npm test` | Run all tests (Vitest) |
   | `npm run test:watch` | Tests in watch mode |
   | `npm run build:android` | Build web + sync to Android |
   | `npm run build:ios` | Build web + sync to iOS |
   | `npm run build:native` | Build web + sync to both platforms |
   | `npm run cap:sync` | Sync web assets to native projects |
   | `npm run cap:android` | Open Android project in Android Studio |
   | `npm run cap:ios` | Open iOS project in Xcode |

   ---

   ## File Structure

   ```
   BabyTracker/
   ├── .env                          ← Your environment variables (git-ignored)
   ├── .env.example                  ← Template for other developers
   ├── capacitor.config.json         ← Native app config (splash, plugins)
   ├── icons/                        ← Source brand assets (all sizes)
   ├── public/
   │   ├── favicon-32x32.png         ← Browser tab icon
   │   ├── favicon-64x64.png         ← Browser tab icon (HiDPI)
   │   ├── apple-touch-icon.png      ← iOS home screen (180×180)
   │   ├── icon-192.png              ← PWA icon (192×192)
   │   ├── icon-512.png              ← PWA icon (512×512)
   │   ├── logo-navbar.png           ← Desktop top bar logo
   │   ├── logo-no-tagline.png       ← Logo without tagline
   │   ├── logo-full.png             ← Logo with tagline
   │   ├── logo-dark.png             ← Logo for dark backgrounds
   │   ├── mark-256.png              ← Mark only (transparent)
   │   ├── mark-dark.png             ← Mark for dark backgrounds
   │   ├── manifest.json             ← PWA manifest
   │   └── _redirects                ← Notes only (Cloudflare SPA = no top-level 404.html); Netlify uses netlify.toml
   ├── src/
   │   ├── app/
   │   │   ├── components/           ← UI components
   │   │   ├── contexts/             ← React contexts (Auth, Baby, Premium)
   │   │   ├── pages/                ← Route pages
   │   │   ├── utils/                ← Utilities (supabase, storage, etc.)
   │   │   └── plugins/
   │   │       └── CapacitorBridge.ts ← Web→Native widget data sync
   │   └── main.tsx                  ← App entry point
   ├── supabase/
   │   └── functions/server/
   │       ├── index-SINGLE-FILE-FOR-DASHBOARD.ts  ← Full Edge Function (use this one!)
   │       ├── index.tsx              ← Multi-file version (fewer features)
   │       └── kv_store.tsx           ← KV helper module
   ├── android/
   │   └── app/src/main/
   │       ├── java/com/cradl/app/
   │       │   ├── MainActivity.java     ← Capacitor entry
   │       │   └── CradlWidget.java      ← Widget provider
   │       └── res/
   │           ├── layout/widget_cradl.xml
   │           ├── xml/widget_cradl_info.xml
   │           ├── drawable/splash.png
   │           └── mipmap-*/ic_launcher*.png
   ├── ios/
   │   ├── App/                       ← Main Capacitor iOS app
   │   │   └── App/Assets.xcassets/   ← App icon + splash
   │   ├── CradlWidget/
   │   │   ├── CradlWidget.swift      ← WidgetKit extension
   │   │   ├── Assets.xcassets/       ← Widget icon + mark
   │   │   └── Info.plist
   │   └── CradlWatch Watch App/
   │       ├── CradlWatchApp.swift     ← watchOS entry
   │       ├── ContentView.swift       ← Watch UI
   │       ├── WatchDataStore.swift    ← WatchConnectivity
   │       ├── Assets.xcassets/        ← Watch icon + mark
   │       └── Info.plist
   └── docs/
      └── SUPABASE_SETUP.md          ← Detailed Supabase setup
   ```
