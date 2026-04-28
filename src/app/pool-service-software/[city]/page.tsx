import { Metadata } from "next";
import Link from "next/link";
import { Waves, CheckCircle2, MapPin } from "lucide-react";

const TOP_MARKETS = [
  { slug:"phoenix-az",         city:"Phoenix",       state:"AZ", pools:400000, avg_temp:99,  tagline:"Extreme heat demands smart chemistry" },
  { slug:"miami-fl",           city:"Miami",         state:"FL", pools:320000, avg_temp:88,  tagline:"Year-round pools need year-round management" },
  { slug:"los-angeles-ca",     city:"Los Angeles",   state:"CA", pools:490000, avg_temp:82,  tagline:"LA's pool industry runs on PoolPal AI" },
  { slug:"orlando-fl",         city:"Orlando",       state:"FL", pools:180000, avg_temp:90,  tagline:"Pool tech capital of Florida" },
  { slug:"las-vegas-nv",       city:"Las Vegas",     state:"NV", pools:210000, avg_temp:103, tagline:"Desert heat burns chlorine fast — we calculate it" },
  { slug:"houston-tx",         city:"Houston",       state:"TX", pools:280000, avg_temp:94,  tagline:"Humidity + heat = algae risk. AI keeps it in check." },
  { slug:"dallas-tx",          city:"Dallas",        state:"TX", pools:230000, avg_temp:96,  tagline:"Texas-sized pool operations need smarter software" },
  { slug:"san-diego-ca",       city:"San Diego",     state:"CA", pools:190000, avg_temp:72,  tagline:"Year-round service needs year-round software" },
  { slug:"tampa-fl",           city:"Tampa",         state:"FL", pools:170000, avg_temp:91,  tagline:"Gulf Coast pool service, automated" },
  { slug:"scottsdale-az",      city:"Scottsdale",    state:"AZ", pools:140000, avg_temp:104, tagline:"The pool capital of Arizona runs on PoolPal AI" },
  { slug:"jacksonville-fl",    city:"Jacksonville",  state:"FL", pools:95000,  avg_temp:88,  tagline:"Northeast Florida's go-to pool management platform" },
  { slug:"fort-lauderdale-fl", city:"Ft. Lauderdale",state:"FL", pools:110000, avg_temp:87,  tagline:"Venice of America runs on smart pool software" },
  { slug:"sacramento-ca",      city:"Sacramento",    state:"CA", pools:120000, avg_temp:94,  tagline:"Central Valley pool pros choose PoolPal AI" },
  { slug:"austin-tx",          city:"Austin",        state:"TX", pools:95000,  avg_temp:97,  tagline:"Keep Austin's pools perfect with AI chemistry" },
  { slug:"charlotte-nc",       city:"Charlotte",     state:"NC", pools:88000,  avg_temp:90,  tagline:"Southeast pool service, supercharged" },
  // UK markets
  { slug:"london-uk",          city:"London",        state:"UK", pools:120000, avg_temp:72,  tagline:"London's pool industry runs on smarter software" },
  { slug:"birmingham-uk",      city:"Birmingham",    state:"UK", pools:45000,  avg_temp:68,  tagline:"Midlands pool pros choose PoolPal AI" },
  { slug:"manchester-uk",      city:"Manchester",    state:"UK", pools:38000,  avg_temp:65,  tagline:"Greater Manchester pool service, automated" },
  { slug:"bristol-uk",         city:"Bristol",       state:"UK", pools:32000,  avg_temp:67,  tagline:"Southwest UK pool management made easy" },
  { slug:"edinburgh-uk",       city:"Edinburgh",     state:"UK", pools:22000,  avg_temp:62,  tagline:"Scotland's go-to pool management platform" },
  // Australia markets
  { slug:"sydney-au",          city:"Sydney",        state:"AU", pools:180000, avg_temp:88,  tagline:"Sydney's pool industry runs on PoolPal AI" },
  { slug:"melbourne-au",       city:"Melbourne",     state:"AU", pools:140000, avg_temp:82,  tagline:"Victoria's pool pros choose PoolPal AI" },
  { slug:"brisbane-au",        city:"Brisbane",      state:"AU", pools:160000, avg_temp:91,  tagline:"Queensland heat demands smart chemistry" },
  { slug:"perth-au",           city:"Perth",         state:"AU", pools:130000, avg_temp:95,  tagline:"WA's sunny climate means year-round service" },
  { slug:"adelaide-au",        city:"Adelaide",      state:"AU", pools:95000,  avg_temp:90,  tagline:"South Australia pool service, supercharged" },
  { slug:"gold-coast-au",      city:"Gold Coast",    state:"AU", pools:85000,  avg_temp:93,  tagline:"Hinterland heat burns chlorine fast — AI calculates it" },
];

// Generate static pages for all markets
export async function generateStaticParams() {
  return TOP_MARKETS.map((m) => ({ city: m.slug }));
}

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const market = TOP_MARKETS.find((m) => m.slug === params.city);
  if (!market) return { title: "PoolPal AI" };

  const title = `Pool Service Software ${market.city}, ${market.state} | PoolPal AI`;
  const desc  = `The #1 pool route management app for ${market.city} pool service companies. GPS tracking, AI chemistry, automated reports, and invoicing. Try free 14 days.`;

  return {
    title,
    description: desc,
    keywords:    [
      `pool service software ${market.city}`,
      `pool route management ${market.city} ${market.state}`,
      `pool tech app ${market.city}`,
      `pool cleaning software ${market.state}`,
      `skimmer alternative ${market.city}`,
    ],
    openGraph: { title, description: desc, type: "website" },
  };
}

export default function CityLandingPage({ params }: { params: { city: string } }) {
  const market = TOP_MARKETS.find((m) => m.slug === params.city);

  if (!market) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">City not found</p>
          <Link href="/" className="text-[#1756a9] hover:underline mt-2 block">← Back to PoolPal AI</Link>
        </div>
      </div>
    );
  }

  const FEATURES = [
    { icon: "🛰️", title: "GPS Route Tracking", desc: `Auto-log every mile driven in ${market.city} for tax deductions.` },
    { icon: "⚗️", title: "AI Chemistry",        desc: `Heat-adjusted dosages for ${market.avg_temp}°F ${market.state} summers.` },
    { icon: "📄", title: "Auto PDF Reports",    desc: "Email service reports to clients automatically after every visit." },
    { icon: "💳", title: "Invoicing",           desc: "Send invoices and collect payments — all in one app." },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1756a9] rounded-xl flex items-center justify-center">
            <Waves className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">PoolPal AI</span>
        </div>
        <Link href="/auth/login">
          <button className="btn-primary text-sm">Start Free Trial</button>
        </Link>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#e8f1fc] text-[#1756a9] px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
          <MapPin className="w-3.5 h-3.5" />
          {market.city}, {market.state}
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Pool Service Software<br />
          for {market.city} Pros
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-4">
          {market.tagline}. PoolPal AI manages your routes, chemistry, reports, and invoicing — all in one app.
        </p>
        <p className="text-sm text-slate-400 mb-10">
          Join pool service companies across {market.city} already saving hours every week.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/auth/login">
            <button className="btn-primary text-lg px-8 py-4">
              Start Free 14-Day Trial
            </button>
          </Link>
          <Link href="/homeowner">
            <button className="btn-outline text-lg px-8 py-4">
              I'm a Pool Owner →
            </button>
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-4">No credit card required · Cancel anytime</p>
      </div>

      {/* Features */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Built for {market.city} Pool Pros
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-12">The {market.city} Pool Market</h2>
        <div className="grid grid-cols-3 gap-8">
          {[
            { value: `${(market.pools / 1000).toFixed(0)}k+`, label: "Residential pools" },
            { value: `${market.avg_temp}°F`,                   label: "Peak summer temp" },
            { value: "$0.67/mi",                               label: "IRS tax deduction" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-bold text-[#1756a9] mb-2">{s.value}</p>
              <p className="text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[#1756a9] py-16 text-center px-6">
        <h2 className="text-3xl font-bold text-white mb-4">
          Run your {market.city} pool business smarter
        </h2>
        <p className="text-blue-100 mb-8 max-w-xl mx-auto">
          GPS tracking, AI chemistry, automated reports, and invoicing — starting at $79/month.
        </p>
        <Link href="/auth/login">
          <button className="bg-white text-[#1756a9] font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#e8f1fc] transition-colors">
            Start Free Trial →
          </button>
        </Link>
      </div>

      {/* Schema markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "SoftwareApplication",
            name:       "PoolPal AI",
            applicationCategory: "BusinessApplication",
            operatingSystem: "iOS, Android, Web",
            description: `Pool service management software for ${market.city}, ${market.state} pool service companies.`,
            offers: { "@type": "Offer", price: "79", priceCurrency: "USD" },
            aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "247" },
          }),
        }}
      />
    </div>
  );
}
