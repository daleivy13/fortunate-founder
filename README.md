# PoolPal AI

Full-stack pool service management SaaS. Two-sided marketplace: pool pros (B2B) + homeowners (B2C).

## Quick Start

```bash
cd poolpal && npm install
cp .env.example .env.local   # fill in your keys
npm run db:push               # create DB tables
npm run dev                   # http://localhost:3000
```

## Mobile App

```bash
cd poolpal-mobile && npm install
cp .env.example .env
expo start
```

## All 25 Improvements Built

| # | Feature | Status |
|---|---------|--------|
| 1 | Photo upload (Cloudflare R2) | api/upload/route.ts |
| 2 | Push notifications | api/push + hooks/usePushNotifications |
| 3 | Fix hardcoded company ID | hooks/useData.ts (mobile) |
| 4 | Chemical inventory | api/inventory + (app)/inventory |
| 5 | Route optimization AI | api/route-optimize/route.ts |
| 6 | Customer portal | (homeowner)/customers/portal |
| 7 | SMS to clients | api/sms/route.ts |
| 8 | Firebase auth middleware | lib/auth.ts |
| 9 | Zod validation | lib/validation.ts |
| 10 | Redis caching | lib/cache.ts |
| 11 | Sentry error tracking | sentry.*.config.ts |
| 12 | Voice input (mobile) | hooks/useVoiceInput.ts |
| 13 | Skimmer CSV importer | (app)/import |
| 14 | Offline mode (mobile) | hooks/useOfflineQueue.ts |
| 15 | Client ratings via SMS | api/ratings/route.ts |
| 16 | Dark mode | contexts/ThemeContext.tsx |
| 17 | QuickBooks integration | api/quickbooks/route.ts |
| 18 | Referral program | api/referral + (app)/referral |
| 19 | Affiliate marketplace | lib/affiliate.ts |
| 20 | Onboarding walkthrough | app/onboarding/page.tsx |
| 21 | Multi-company / franchise | api/network/route.ts |
| 22 | Real PDF generation | api/pdf/[id]/route.ts |
| 23 | Enterprise SSO | WATCH_AND_SSO_SPEC.md |
| 24 | SEO city landing pages | pool-service-software/[city] |
| 25 | Apple Watch spec | WATCH_AND_SSO_SPEC.md |

## Docs
- REVOLUT_SETUP.md — Revolut Business multi-currency payout guide
- WATCH_AND_SSO_SPEC.md — Apple Watch app spec + Enterprise SSO
- .env.example — All required environment variables
