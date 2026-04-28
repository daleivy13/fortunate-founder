"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Star, CheckCircle2 } from "lucide-react";

function RatingContent() {
  const params    = useSearchParams();
  const token     = params.get("token") ?? "";
  const [rating,  setRating]  = useState(0);
  const [hover,   setHover]   = useState(0);
  const [comment, setComment] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");
  const [info,    setInfo]    = useState<{ companyName: string; poolName: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    try {
      const decoded = atob(token);
      const [, , , companyName, poolName] = decoded.split(":");
      if (companyName) setInfo({ companyName: decodeURIComponent(companyName), poolName: decodeURIComponent(poolName ?? "") });
    } catch {}
  }, [token]);

  const submit = async () => {
    if (!rating) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ratings/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, rating, comment }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to submit rating");
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="card p-8 max-w-sm w-full text-center">
          <p className="text-slate-500">Invalid rating link.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="card p-10 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Thank you!</h1>
          <p className="text-slate-500 text-sm">Your feedback means a lot to us. We look forward to serving you again.</p>
          {rating >= 5 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm text-amber-800">⭐ Love your service? Consider leaving us a Google review!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-4">
            <img src="/logo.png" alt="" className="w-full h-full object-cover" />
          </div>
          {info && (
            <>
              <h1 className="text-lg font-bold text-slate-900">{info.companyName}</h1>
              {info.poolName && <p className="text-sm text-slate-500">{info.poolName}</p>}
            </>
          )}
          <p className="text-slate-600 text-sm mt-2">How was your pool service today?</p>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-10 h-10 ${(hover || rating) >= n ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-100"}`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm font-semibold text-slate-700">
            {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
          </p>
        )}

        {/* Comment */}
        <div>
          <label className="label">Comments (optional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Anything you'd like to share…"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          onClick={submit}
          disabled={!rating || saving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? "Submitting…" : "Submit Rating"}
        </button>
      </div>
    </div>
  );
}

export default function RatingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Loading…</div>
      </div>
    }>
      <RatingContent />
    </Suspense>
  );
}
