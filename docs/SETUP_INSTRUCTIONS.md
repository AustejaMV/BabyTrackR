# Baby Care Tracker - Setup Instructions

## Features Implemented

✅ **Google OAuth Authentication** - Users can sign in with their Google account  
✅ **Family Sharing** - Invite family members to share tracking data  
✅ **Cloud Sync** - All data syncs to Supabase across devices  
✅ **PDF Export** - Generate pediatric reports from the Settings page  
✅ **PWA Shortcuts** - Add quick action buttons to phone home screen  

## Google OAuth Setup

**IMPORTANT**: To enable Google sign-in, you must configure Google OAuth in your Supabase project.

### Steps:

1. Go to your Supabase Dashboard: https://app.supabase.com/project/gmtqrtpqfmbkljagskfn

2. Navigate to **Authentication** → **Providers**

3. Find **Google** and click to configure

4. Follow Supabase's guide: https://supabase.com/docs/guides/auth/social-login/auth-google
   - Create a Google Cloud Project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `https://gmtqrtpqfmbkljagskfn.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

5. Enable Google provider in Supabase

## PWA Installation (For Home Screen Shortcuts)

### On Android:
1. Open the app in Chrome
2. Tap the menu (3 dots) → "Add to Home screen"
3. Long-press the app icon → "Widgets" or tap and hold to see shortcuts
4. You'll see quick actions for: Pee, Poop, Feed, Sleep

### On iOS:
1. Open the app in Safari
2. Tap Share → "Add to Home Screen"
3. Note: iOS has limited shortcut support compared to Android

## Using the App

### First Time Setup:
1. Visit the app
2. Click "Continue with Google"
3. Sign in with your Google account
4. A family will be automatically created for you

### Inviting Family Members:
1. Go to Settings (bottom navigation)
2. Under "Family Sharing", enter their email address
3. Click "Invite"
4. They need to sign in with that exact email to join your family

### Exporting Reports:
1. Go to Settings
2. Click "Export PDF Report for Pediatrician"
3. A PDF will download with the last 7 days of data

### Quick Actions (PWA):
- After installing on home screen, long-press the app icon
- Select quick actions like "Log Pee" or "Log Poop"
- These create instant entries without opening the full app

## Data Sync

All tracking data is automatically synced to the cloud when you're signed in:
- Sleep sessions
- Feeding records
- Diaper changes
- Tummy time
- Settings (feeding interval)

Family members will see the same data in real-time after signing in.

## Offline Support

The app still works offline! Data is stored locally and will sync when you're back online.
