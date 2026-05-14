# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start Expo dev server (scan QR with Expo Go)
npm run android    # Launch on Android emulator
npm run ios        # Launch on iOS simulator (Mac only)
npm run web        # Launch in browser
npx tsc --noEmit   # TypeScript check (no compilation output)
npx expo install <pkg>   # Install Expo-compatible package version
```

## Architecture

**Framework**: Expo SDK 54 + Expo Router (file-based routing), React Native 0.81

**Auth flow**: Firebase JS SDK → `onAuth` listener in `app/_layout.tsx` → fetches company from API → sets Zustand store → `app/index.tsx` redirects based on `user`/`company` state.

**State**: Zustand store at `src/lib/store.ts` holds `user`, `company`, `idToken`. Token is also set on the `api` client via `setAuthToken()`.

**API**: `src/lib/api.ts` — thin fetch wrapper that injects `Authorization: Bearer <token>`. All hooks in `src/hooks/useData.ts` use React Query + this client. The API base URL should be set via `EXPO_PUBLIC_API_URL` env var; defaults to `http://localhost:3000`.

**Routing structure**:
```
app/
  _layout.tsx          Root layout (QueryClientProvider + AuthListener)
  index.tsx            Auth gate — redirects to login / onboarding / dashboard
  onboarding.tsx       Company setup for new users
  (auth)/
    _layout.tsx
    login.tsx          Email/password sign in + sign up
  (tabs)/
    _layout.tsx        Bottom tab bar (5 tabs)
    dashboard.tsx      Stats grid + quick actions
    pools.tsx          Pool list + add pool modal
    routes.tsx         GPS tracking + stop management
    reports.tsx        Service report list + new report modal
    settings.tsx       Profile editing + sign out
```

**Key packages**:
- `expo-location` — GPS tracking in routes tab; requires foreground permission
- `@tanstack/react-query` v5 — data fetching
- `zustand` v5 — global state
- `firebase` v12 — auth

**GPS mileage**: Uses haversine formula in `routes.tsx`. Logged to `/api/mileage` on route stop. IRS rate hardcoded at `$0.67/mile`.

**Backend**: Connects to the Next.js web app API (see `fortunate-founder/` sibling directory). All API routes require Firebase Bearer token except `/api/homeowner/*`.
