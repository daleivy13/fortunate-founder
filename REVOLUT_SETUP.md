# Revolut Business → Stripe Multi-Currency Payout Setup

## What this achieves

Every time a customer pays for PoolPal AI — whether in USD, GBP, EUR, AUD —
the money lands in the matching currency account in your Revolut Business.
No forced conversion. No fees. You travel, you convert what you need in Revolut.

---

## Step 1 — Open Revolut Business

Go to: https://business.revolut.com/sign-up

You'll need:
- Your name + email
- Phone number
- ID (passport or driver's license)
- Proof of business (can be simple — your name + app description)

Takes ~10–30 minutes to get approved.

---

## Step 2 — Open currency accounts in Revolut Business

Once approved, in the Revolut Business app or web:

1. Go to **Accounts** tab
2. Click **Add account / currency**
3. Open one for each currency you want:
   - 🇺🇸 **USD** — US dollar (biggest market)
   - 🇬🇧 **GBP** — British pound
   - 🇪🇺 **EUR** — Euro (covers all EU countries)
   - 🇦🇺 **AUD** — Australian dollar
   - 🇨🇦 **CAD** — Canadian dollar (optional)

Each account will have its own:
- **IBAN** (for EUR/international)
- **Sort code + account number** (for GBP)
- **Routing + account number** (for USD)

---

## Step 3 — Add each Revolut account to Stripe

In **Stripe Dashboard** → Settings → Payouts:

For each currency:
1. Click **Add bank account**
2. Select the currency (USD, GBP, EUR, etc.)
3. Enter the Revolut Business bank details for that currency
4. Stripe will make 2 small test deposits (verify them in Revolut)
5. Copy the bank account ID (starts with `ba_`) → paste into `.env.local`

**Important:** Match the currency to the right account.
- USD Revolut account → Stripe USD payout
- GBP Revolut account → Stripe GBP payout
- EUR Revolut account → Stripe EUR payout

---

## Step 4 — Enable Revolut Pay as a payment method

In **Stripe Dashboard** → Settings → Payment methods:

1. Find **Revolut Pay**
2. Click **Turn on**

This adds Revolut Pay as a checkout option for customers in:
UK, Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic,
Denmark, Estonia, Finland, France, Germany, Greece, Hungary,
Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Netherlands,
Norway, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden

Your app already detects the customer's locale and shows Revolut Pay
automatically to eligible customers. No code change needed.

---

## Step 5 — Set up Stripe multi-currency prices

For each plan (Solo/Growth/Enterprise), create prices in each currency:

In **Stripe Dashboard** → Products:
1. Click on "PoolPal Solo"
2. Click **Add price**
3. Select currency → enter amount → Save
4. Copy the `price_` ID → add to `.env.local`

**Pricing to use:**
| Plan    | USD  | GBP  | EUR  | AUD  |
|---------|------|------|------|------|
| Solo    | $79  | £59  | €69  | A$119|
| Growth  | $179 | £139 | €159 | A$269|
| Enterprise | $399 | £299 | €349 | A$599 |

---

## Step 6 — Configure payout schedule

In **Stripe Dashboard** → Settings → Payouts:

Set your preferred schedule:
- **Daily** — money arrives next business day
- **Weekly** — less frequent but predictable
- **Monthly** — best for bookkeeping

Recommended: **Daily payouts** — money hits Revolut every day, you always have cash flow visibility.

---

## What the money flow looks like

```
Pool company in Australia pays A$269/mo via Stripe
  ↓
Stripe processes AUD payment (takes 2.9% + 30¢)
  ↓
Stripe holds for 2 business days (settlement)
  ↓
Stripe pays out to your Revolut Business AUD account
  ↓
Money sits in Revolut AUD account
  ↓
You're in Mexico → convert AUD to MXN in Revolut app at interbank rate
  ↓
Done. No bank involved. No wire fees.
```

---

## Useful Revolut Business features for you

- **Multi-currency cards** — spend from any currency account with no conversion if you have that currency
- **Instant transfers** — send to other Revolut users instantly, free
- **Exchange at interbank rate** — convert between currencies with minimal markup
- **Expense management** — categorize business expenses for tax time
- **Xero/QuickBooks sync** — connect for automatic bookkeeping
- **Team cards** — give virtual cards to employees with spending limits

---

## Notes

- Stripe may occasionally flag Revolut as a "virtual bank" and take slightly longer to verify
- Once verified, payouts are reliable and consistent
- If a payout fails, Stripe retries and notifies you by email
- Keep at least one traditional bank account as a backup (just in case)
