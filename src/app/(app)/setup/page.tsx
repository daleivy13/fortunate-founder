"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Zap } from "lucide-react";

interface Check {
  key:         string;
  label:       string;
  required:    boolean;
  configured:  boolean;
  preview:     string | null;
}

interface SetupData {
  ready:   boolean;
  checks:  Check[];
  summary: { total: number; configured: number; missing_required: string[] };
}

const ENV_SETUP_LINKS: Record<string, string> = {
  DATABASE_URL:                    "https://neon.tech",
  NEXT_PUBLIC_FIREBASE_API_KEY:    "https://console.firebase.google.com",
  FIREBASE_PROJECT_ID:             "https://console.firebase.google.com",
  ANTHROPIC_API_KEY:               "https://console.anthropic.com",
  STRIPE_SECRET_KEY:               "https://dashboard.stripe.com/apikeys",
  STRIPE_WEBHOOK_SECRET:           "https://dashboard.stripe.com/webhooks",
  STRIPE_PRICE_SOLO_USD:           "https://dashboard.stripe.com/products",
  STRIPE_PRICE_GROWTH_USD:         "https://dashboard.stripe.com/products",
  STRIPE_PRICE_ENT_USD:            "https://dashboard.stripe.com/products",
  STRIPE_PRICE_HOMEOWNER:          "https://dashboard.stripe.com/products",
  RESEND_API_KEY:                  "https://resend.com/api-keys",
  OPENWEATHER_API_KEY:             "https://openweathermap.org/api",
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "https://console.cloud.google.com",
};

export default function SetupPage() {
  const [data,    setData]    = useState<SetupData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/setup")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">App Setup</h1>
          <p className="text-slate-500 text-sm mt-1">Configure your environment variables to enable all features</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {data && (
        <div className={`rounded-2xl p-5 border-2 flex items-center gap-4 ${
          data.ready
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}>
          {data.ready ? (
            <Zap className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          )}
          <div>
            <p className={`font-bold ${data.ready ? "text-emerald-800" : "text-amber-800"}`}>
              {data.ready
                ? `All required services configured — ${data.summary.configured}/${data.summary.total} total`
                : `${data.summary.configured}/${data.summary.total} services configured`}
            </p>
            {!data.ready && data.summary.missing_required.length > 0 && (
              <p className="text-sm text-amber-700 mt-0.5">
                Missing required: {data.summary.missing_required.join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card divide-y divide-slate-100">
        {loading && !data ? (
          <div className="p-6 text-center text-slate-400 text-sm">Checking configuration…</div>
        ) : data ? (
          data.checks.map((check) => (
            <div key={check.key} className="flex items-center gap-3 px-5 py-3.5">
              {check.configured ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : check.required ? (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                <p className="text-xs text-slate-400 font-mono truncate">
                  {check.configured ? check.preview : check.key}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!check.required && !check.configured && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Optional</span>
                )}
                {!check.configured && ENV_SETUP_LINKS[check.key] && (
                  <a
                    href={ENV_SETUP_LINKS[check.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-pool-500 hover:underline font-medium"
                  >
                    Get key →
                  </a>
                )}
              </div>
            </div>
          ))
        ) : null}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Add or update env vars in <code className="bg-slate-100 px-1 py-0.5 rounded">.env.local</code> then restart the dev server.
        On Vercel, set them in Project → Settings → Environment Variables.
      </p>
    </div>
  );
}
