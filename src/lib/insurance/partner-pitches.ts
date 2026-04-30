export interface PartnerPitch {
  partner:    string;
  subject:    string;
  body:       string;
}

export const PARTNER_PITCHES: PartnerPitch[] = [
  {
    partner: "SPPA (Swimming Pool & Spa Association)",
    subject: "Embedded Pool Insurance Partnership — PoolPal AI Platform",
    body: `Hi [Name],

I'm the founder of PoolPal AI, a SaaS platform for pool service companies with [X] active techs servicing [X] pools monthly.

We've built a compliance engine (PoolPal Protocol) that tracks chemistry readings daily and assigns insurance eligibility scores to each pool. We'd like to embed your coverage directly into our homeowner portal.

Why this is a fit:
• Every pool on our platform has 90+ days of chemistry data — underwriting is instant
• Homeowners already trust PoolPal for their water quality data
• We can pre-fill applications and pass verified service records directly to your API

We're looking for a co-branded product offering split 70/30 (your paper, our distribution).

Would you have 20 minutes next week?

Best,
[Founder]
PoolPal AI`,
  },
  {
    partner: "Hippo Insurance",
    subject: "Pool Coverage Add-On via PoolPal AI — 5,000+ Verified Pool Owners",
    body: `Hi [Name],

PoolPal AI is a pool management platform. We track chemistry, equipment health, and service verification for residential pools across the US.

We have a segment of homeowners actively seeking pool liability + equipment breakdown coverage. Our compliance scores give your underwriters clean, verified data they can't get anywhere else.

Integration idea: A single "Get Insured" CTA in our app routes qualified users to a co-branded Hippo flow. We pass: pool type, volume, equipment age, compliance score, and service history.

Interested in a pilot with our California and Florida user base first?

[Founder]`,
  },
  {
    partner: "Openly Insurance",
    subject: "High-Value Pool Homeowners — Partnership Inquiry",
    body: `Hi [Name],

Openly specializes in high-value homes. We have a growing segment of Estate+ pool owners (pools valued $50K+, heated, with automation systems) who need proper coverage.

PoolPal AI surfaces these owners through equipment tracking and compliance data. We'd like to refer them to Openly for umbrella + pool-specific riders.

Our data: equipment manufacturer, model, age, condition rating, service history, and 90-day chemistry compliance.

Happy to share a sample data schema. Can we connect?

[Founder]
PoolPal AI`,
  },
  {
    partner: "Lemonade Insurance",
    subject: "Millennial Pool Owners + Instant Coverage — PoolPal AI Partnership",
    body: `Hi [Name],

PoolPal AI is built for the next generation of pool owners — mobile-first, tech-savvy, and skeptical of slow insurance processes.

Lemonade's instant coverage model is a perfect fit for our in-app insurance flow. We see strong conversion when the purchase journey takes under 3 minutes.

We'd integrate Lemonade's API directly. Our pre-verification data would eliminate most underwriting friction — just confirm the quote and bind.

Our homeowner base skews 25–45, coastal, above-average income. High-conversion segment for digital-first products.

Open to a technical integration call?

[Founder]
PoolPal AI`,
  },
];
