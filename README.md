# PoolPal AI

Full-stack pool service management SaaS. Two-sided marketplace: pool pros (B2B) + homeowners (B2C).

Built with Next.js 14 App Router · Neon Postgres · Drizzle ORM · Firebase Auth · Anthropic Claude · Stripe

## Quick Start

```bash
git clone https://github.com/daleivy13/fortunate-founder.git
cd fortunate-founder
npm install
cp .env.example .env.local   # fill in your keys (see Setup section below)
npm run db:push               # push schema to Neon
npm run dev                   # http://localhost:3000
```

Or use the bootstrap script (Windows):

```powershell
.\bootstrap.ps1   # clones, installs deps, creates .env.local
.\run-claude-code.ps1  # launches Claude Code for autonomous build tasks
```

## Setup — Required Environment Variables

Copy `.env.example` to `.env.local` and fill in the values below.

### Database — Neon Postgres
| Key | Where to get it |
|-----|----------------|
| `DATABASE_URL` | [neon.tech](https://neon.tech) → New Project → Connection string |

### Firebase Auth (Client)
| Key | Where to get it |
|-----|----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → Your Apps → Web App |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same |

### Firebase Admin (Server-side)
| Key | Where to get it |
|-----|----------------|
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → Service Accounts → Generate new private key |
| `FIREBASE_CLIENT_EMAIL` | same JSON file |
| `FIREBASE_PRIVATE_KEY` | same JSON file (include `-----BEGIN...-----END...` with `\n` newlines) |

### Anthropic (AI Features)
| Key | Where to get it |
|-----|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

### Stripe (Payments)
| Key | Where to get it |
|-----|----------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_SECRET_KEY` | same |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret |
| `STRIPE_PRICE_SOLO_USD` | Stripe Dashboard → Products → create prices per plan/currency |
| `STRIPE_PRICE_GROWTH_USD` | same |
| `STRIPE_PRICE_ENT_USD` | same |

### Upstash Redis (Caching)
| Key | Where to get it |
|-----|----------------|
| `UPSTASH_REDIS_REST_URL` | [console.upstash.com](https://console.upstash.com) → Create Database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | same |

### Email — Resend
| Key | Where to get it |
|-----|----------------|
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys → Create Key |
| `RESEND_FROM_EMAIL` | A verified sender domain in your Resend account |

### Photo Storage — Cloudflare R2
| Key | Where to get it |
|-----|----------------|
| `CF_ACCOUNT_ID` | [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → Account ID |
| `CF_R2_ACCESS_KEY` | R2 → Manage R2 API Tokens → Create API Token |
| `CF_R2_SECRET_KEY` | same |
| `CF_R2_BUCKET_NAME` | R2 → Create Bucket (e.g. `poolpal-reports`) |
| `CF_R2_PUBLIC_URL` | Bucket settings → Public access → Public bucket URL |

### Maps & Weather
| Key | Where to get it |
|-----|----------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com) → APIs → Maps JavaScript API |
| `OPENWEATHER_API_KEY` | [openweathermap.org/api](https://openweathermap.org/api) → Sign up → API keys |

### App Config
| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` in dev, your domain in prod |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` in dev |

### Multi-Currency Payouts — Revolut Business (optional)
| Key | Where to get it |
|-----|----------------|
| `REVOLUT_STRIPE_ACCOUNT_USD` | Stripe Dashboard → Settings → Payouts → Add bank account (Revolut USD) |
| `REVOLUT_STRIPE_ACCOUNT_GBP` | same for GBP |
| `REVOLUT_STRIPE_ACCOUNT_EUR` | same for EUR |
| `REVOLUT_STRIPE_ACCOUNT_AUD` | same for AUD |

See `REVOLUT_SETUP.md` for the full Revolut Business setup guide.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push Drizzle schema to Neon (all 3 schema files)
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 App Router, Tailwind CSS |
| Auth | Firebase Auth (client) + Firebase Admin (server) |
| Database | Neon serverless Postgres + Drizzle ORM |
| Cache | Upstash Redis (graceful no-op if not configured) |
| AI | Anthropic Claude (`claude-sonnet-4-6`, vision via `claude-opus-4-5`) |
| Email | Resend |
| Payments | Stripe (subscriptions + checkout) |
| Storage | Cloudflare R2 |
| Maps | Google Maps JS API |

### Route Groups

- `(app)/` — Pro dashboard (pool service companies). Firebase auth required.
- `(homeowner)/` — Consumer pages (chemistry checker, diagnostic, insurance, booking).
- `pool-service-software/[city]/` — Static SEO city landing pages.

### Schema Files

Three schema files — all pushed by `npm run db:push`:

- `src/backend/db/schema.ts` — Core tables (companies, pools, chemistry_readings, service_reports, invoices, routes, equipment, etc.)
- `src/backend/db/homeowner-schema.ts` — Homeowner-side tables
- `src/backend/db/tasks-schema.ts` — Task tracking tables

## Features Built

| Feature | Location |
|---------|----------|
| Chemistry AI (dosage calculator + Claude analysis) | `(app)/chemistry` |
| Photo test kit scanner | `components/TestKitScanner.tsx` |
| AI diagnostic chat (12 issue types) | `(homeowner)/diagnostic`, `components/DiagnosticChat.tsx` |
| Equipment register with alerts | `(app)/equipment` |
| Equipment training library | `(homeowner)/learn/[category]` |
| Service reports + GPS routes | `(app)/routes`, `(app)/reports` |
| PDF invoices (react-pdf + Resend) | `api/invoices/[id]/send` |
| Compliance engine (PoolPal Protocol) | `lib/compliance/`, `(app)/compliance` |
| Recurring work orders + auto-invoice | `(app)/work-orders` |
| Tech experience levels + training | `(app)/employees/[id]` |
| GPS fraud detection + photo verification | `lib/verification/`, `api/verification/photo` |
| Insurance eligibility + quote engine | `(homeowner)/insurance`, `api/insurance/` |
| Homeowner onboarding wizard | `(homeowner)/pool-setup` |
| Monthly pool inspection flow | `(homeowner)/inspection/monthly` |
| SEO city landing pages (27 cities) | `pool-service-software/[city]` |
| Multi-currency (18 locales, 12 currencies) | `lib/i18n/` |
| Offline mode + service worker | `public/sw.js` |
| Stripe subscriptions | `api/stripe/checkout`, `api/stripe/webhook` |
| QuickBooks integration | `api/quickbooks/` |
| Referral program | `(app)/referral` |

## Docs

- `REVOLUT_SETUP.md` — Revolut Business multi-currency payout guide
- `WATCH_AND_SSO_SPEC.md` — Apple Watch app spec + Enterprise SSO spec
- `CLAUDE.md` — AI coding assistant instructions for this codebase
- `.env.example` — All environment variable keys with comments
