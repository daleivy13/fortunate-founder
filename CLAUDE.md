# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint via next lint
npm run db:push      # Push Drizzle schema changes to Neon (no migrations generated)
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

There are no tests. No test runner is configured.

## Architecture

### Route Groups

The app uses two Next.js route groups with separate layouts:

- `(app)/` — Pro dashboard (pool service companies). Requires Firebase auth. `AuthContext` redirects unauthenticated users to `/auth/login`; users without a company record are redirected to `/onboarding`.
- `(homeowner)/` — Consumer-facing pages (chemistry checker, booking, customer portal). Separate layout, lighter auth requirements.

SEO city landing pages live at `/pool-service-software/[city]/` — these are static/ISR, no auth required.

### Auth Flow

Auth is **dual-layer**:

1. **Middleware** (`src/middleware.ts`) — checks for a `__session` Firebase cookie. Redirects to `/auth/login` if missing (except public paths and `/`).
2. **API routes** use `requireAuth()` from `src/lib/auth.ts` — verifies the `Authorization: Bearer <token>` header using Firebase Admin SDK. In dev without Admin credentials, falls back to accepting `x-user-uid` header (unverified).

`AuthContext` (`src/contexts/AuthContext.tsx`) holds `user` (Firebase User) and `company` (fetched from `/api/companies?ownerId=<uid>` after sign-in). The `company` object is the source of `companyId` used in all data fetches.

### Database

- **Neon (serverless Postgres)** via `@neondatabase/serverless` + Drizzle ORM
- DB client: `src/backend/db/index.ts` — exports `db`
- Main schema: `src/backend/db/schema.ts`
- Extra tables (run manually in Neon SQL editor): `src/backend/db/homeowner-schema.ts` and `src/backend/db/tasks-schema.ts`
- `npm run db:push` syncs schema directly — no migration files are generated

Key schema relationships: `companies` → `pools` → `chemistry_readings` / `service_reports` / `route_stops`. Routes link to `route_stops` which link to pools. All company-scoped data filters by `companyId`.

### API Route Conventions

All API routes follow this pattern:
1. Call `requireAuth(req)` → returns `{ auth, error }`. If `error`, return it immediately.
2. Parse + validate body/params using `validateBody(Schema, data)` from `src/lib/validation.ts`.
3. Query DB via `db` from `src/backend/db`.
4. Optionally invalidate cache via `cacheDel(CacheKeys.xxx(...))` from `src/lib/cache.ts`.

`requireAuth` accepts auth via **two paths**: `Authorization: Bearer <token>` header (mobile app) **or** `__session` cookie (web app browser requests). Web hooks in `src/hooks/useData.ts` rely on the cookie path — they do not set Authorization headers. Intentionally public routes: `api/homeowner/usage`, `api/weather`, `api/stripe/webhook`, `api/chemistry/analyze`.

Note: `api/pools/route.ts` and a few early routes skip `requireAuth` — this is a known gap.

### Caching

`src/lib/cache.ts` wraps Upstash Redis. Degrades gracefully to no-cache if env vars are absent. Use `cacheGetOrSet(key, fetcher, ttlSeconds)` for read-through caching. Pre-built key builders in `CacheKeys`. Mutating routes should call `cacheDel(CacheKeys.xxx(...))` after writes.

### Validation

All Zod schemas live in `src/lib/validation.ts`. Use `validateBody(Schema, await req.json())` — returns `{ data, error }` where `error` is a ready-to-return `Response`.

### AI Integration

`api/chemistry/analyze` calls Claude (`claude-sonnet-4-6`) directly via `@anthropic-ai/sdk` for pool chemistry analysis. Prompt is hardcoded in the route; uses US imperial units. No streaming — waits for full response.

### Smart Route (`api/smart-route`)

Fetches all stops for a route, then for each stop in parallel: calls `/api/weather`, calls `/api/pools/tasks`, queries last chemistry reading. Builds a per-stop brief with priority (`critical` / `high` / `normal`), actions, and weather warnings. Uses `NEXT_PUBLIC_APP_URL` for internal fetch calls.

### Payments

Stripe multi-currency checkout at `api/stripe/checkout`. Webhook handler at `api/stripe/webhook` — this path is excluded from auth middleware. Revolut Business is used for payouts (not in-app code — see `REVOLUT_SETUP.md`).

### Key Lib Files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Firebase Admin token verification, `requireAuth()` helper |
| `src/lib/cache.ts` | Upstash Redis wrapper with `CacheKeys` builders |
| `src/lib/validation.ts` | All Zod schemas + `validateBody()` helper |
| `src/lib/firebase.ts` | Firebase client SDK init (auth, providers) |
| `src/lib/affiliate.ts` | Amazon Associates product link builder |
| `src/lib/i18n/` | 18 locales, 12 currencies, imperial/metric config |

### Tailwind / Brand

Brand colors are registered as Tailwind aliases in `tailwind.config.ts`:
- `pool-500` = `#1756a9` (primary navy)
- `pool-400` / `pool-900` variants
- Cyan accent `#00c3e3` is used inline, not as a Tailwind alias

Dark mode uses CSS variables via `ThemeContext` (`src/contexts/ThemeContext.tsx`).

### Missing / Not Yet Wired

- `src/backend/db/homeowner-schema.ts` and `tasks-schema.ts` tables must be created manually in Neon — `db:push` only pushes `schema.ts`
- `@upstash/redis` is used dynamically (lazy import) — not in `package.json`; install separately if missing
- Mobile app (`poolpal-mobile/`) is a separate Expo project not present in this repo
- Enterprise SSO and Apple Watch are spec-only (`WATCH_AND_SSO_SPEC.md`)
