# UM-Pasa Mobile (Standalone Expo Project)

This is an independent React Native / Expo project for UM-Pasa. Its application code, assets, configuration, and npm dependencies are all inside this folder. It does not import source files from the Laravel project or the previous `mobile` folder. Laravel is not needed to run this app.

The app connects directly to the hosted UM-Pasa Supabase project. Supabase is an external backend service; its database is not copied into this folder. The project must have the required UM-Pasa schema and policies installed before authenticated data operations can work.

The seller "Mark sold" action requires the guarded RPC in `supabase/phase26_listing_sold.sql`. Apply that SQL in the Supabase SQL Editor after the existing mobile API/security setup before using this action. It only allows a seller to mark their own approved sale listing sold, and blocks the change while an open transaction exists.

## Requirements

- Node.js 22.13 or newer
- npm
- Expo Go 57.0.9 for testing on a physical iPhone
- The Supabase project URL and **public anon/publishable key**

## Configure Supabase

1. Copy `.env.example` to `.env` in this folder.
2. Set `EXPO_PUBLIC_SUPABASE_URL` to your Supabase project URL.
3. Set `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the project's public anon/publishable key.
4. Never put a Supabase service-role/secret key in this Expo project. Mobile builds cannot keep server secrets private. Database access must be protected by RLS.

The previous project contains a reconstructed SQL baseline that was explicitly identified as non-authoritative. It is not copied here and must not be run as a substitute for the approved schema. Deploy the verified UM-Pasa schema/policies to Supabase separately.

## Install and run

Run these commands from this folder: 

```bash
npm install
npx expo start --clear --lan
```

Scan the QR code using Expo Go on the same Wi-Fi network. To use a tunnel if local network discovery is blocked:

```bash
npx expo start --clear --tunnel
```

## Independent checks

```bash
npm run typecheck
npx expo install --check
npx expo-doctor
```

## Project structure

- `App.tsx` — application screens and navigation
- `src/auth/` — Supabase Auth context and authentication screens
- `src/services/` — Supabase data operations
- `src/supabase.ts` — the single Supabase client, with SecureStore session persistence
- `src/database.types.ts` — application database types
- `assets/` — UM-Pasa logo and local assets

This folder is the mobile client. Supabase hosting/database configuration remains in the Supabase project, not in the app bundle.

For admin listing alerts, expandable accepted meetup details, and chat profile reviews, apply `supabase/phase27_workflows_and_reviews.sql` after the Phase 25/26 SQL. The migration creates admin notifications for newly submitted or resubmitted listings, adds an authenticated safe review-summary RPC, and synchronizes accepted meetup proposals to the latest active transaction tied to that conversation's item and participants.
