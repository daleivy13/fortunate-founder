"use client";

import { useState } from "react";
import { Waves, ArrowLeft, MapPin, Star, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

const BENEFITS = [
  "Background-checked technicians",
  "Licensed and insured",
  "Digital service reports after every visit",
  "Real-time water chemistry tracking",
  "Transparent pricing — no surprises",
];

export default function FindProPage() {
  const router = useRouter();
  const [zip,     setZip]     = useState("");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zip || !email) return;
    setLoading(true);
    // In production: POST to a lead-gen API or CRM
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1756a9] to-pool-600 text-white px-5 pt-12 pb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-6 h-6" />
          <h1 className="text-xl font-bold">Find a Local Pro</h1>
        </div>
        <p className="text-white/70 text-sm">
          Connect with PoolPal-certified technicians in your area
        </p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {sent ? (
          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Request Sent!</h2>
            <p className="text-slate-500 text-sm mb-4">
              We're matching you with certified pool pros near <strong>{zip}</strong>. Expect a call or text within 24 hours.
            </p>
            <button
              onClick={() => router.push("/homeowner")}
              className="btn-primary w-full"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Why PoolPal pros */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <h2 className="font-bold text-slate-900">Why PoolPal Pros?</h2>
              </div>
              <div className="space-y-2">
                {BENEFITS.map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead form */}
            <div className="card p-4">
              <h2 className="font-bold text-slate-900 mb-4">Get Free Quotes</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">ZIP Code *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="85251"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    required
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Your Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Email *</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="jane@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="(480) 555-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !zip || !email}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Find Pros Near Me"}
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-3 text-center">
                No spam. Your info is only shared with matched pros.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
