"use client";

import { useParams, useRouter } from "next/navigation";
import { usePool } from "@/hooks/useData";
import {
  ArrowLeft, Waves, Phone, Mail, MapPin, FlaskConical,
  FileText, Edit, AlertTriangle, CheckCircle2, Clock, Link2,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

// Fallback mock data if DB not connected yet
const MOCK = {
  pool: { id: 1, name: "Johnson Residence", clientName: "Mike Johnson", clientEmail: "mjohnson@email.com", clientPhone: "(480) 555-0101", address: "1420 Maple Dr, Scottsdale, AZ", type: "residential", volumeGallons: 15000, monthlyRate: 150, serviceDay: "Mon/Thu", notes: "Gate code: 4421. Dog friendly, no issues.", isActive: true },
  readings: [
    { id: 1, freeChlorine: 0.8, ph: 8.4, totalAlkalinity: 120, waterTemp: 82, recordedAt: new Date().toISOString() },
    { id: 2, freeChlorine: 2.8, ph: 7.4, totalAlkalinity: 105, waterTemp: 80, recordedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  ],
  reports: [
    { id: 1, status: "sent", servicedAt: new Date().toISOString(), skimmed: true, brushed: true, vacuumed: true, filterCleaned: true, chemicalsAdded: true, equipmentChecked: true, techNotes: "Added chemicals per AI recommendation.", issuesFound: "pH high" },
    { id: 2, status: "sent", servicedAt: new Date(Date.now() - 7 * 86400000).toISOString(), skimmed: true, brushed: true, vacuumed: true, filterCleaned: false, chemicalsAdded: true, equipmentChecked: true, techNotes: "All good.", issuesFound: null },
  ],
};

const CHEM_STATUS = (val: number | null, min: number, max: number) => {
  if (val === null) return "text-slate-400";
  return val >= min && val <= max ? "text-emerald-600 font-bold" : "text-red-600 font-bold";
};

export default function PoolDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { company } = useAuth();
  const { data, isLoading } = usePool(parseInt(id as string));
  const [copiedPortal, setCopiedPortal] = useState(false);

  const copyPortalLink = async () => {
    if (!company) return;
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId: parseInt(id as string), companyId: company.id }),
      });
      const { url } = await res.json();
      await navigator.clipboard.writeText(url);
      setCopiedPortal(true);
      setTimeout(() => setCopiedPortal(false), 2000);
    } catch {}
  };

  const { pool, readings, reports } = data ?? MOCK;
  const latest = readings?.[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-pool-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const chemStatus =
    latest &&
    latest.freeChlorine >= 1 && latest.freeChlorine <= 4 &&
    latest.ph >= 7.2 && latest.ph <= 7.6
      ? "good"
      : "needs-attention";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button onClick={() => router.back()} className="btn-outline py-1.5 px-3 text-sm mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pool.name}</h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {pool.address}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/chemistry?pool=${pool.id}`}>
            <button className="btn-secondary text-sm">
              <FlaskConical className="w-4 h-4" /> Chemistry
            </button>
          </Link>
          <Link href={`/reports/new?pool=${pool.id}`}>
            <button className="btn-primary text-sm">
              <FileText className="w-4 h-4" /> New Report
            </button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Client card */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-4">Client</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pool-500 to-[#00c3e3] flex items-center justify-center text-white font-bold text-sm">
                {pool.clientName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{pool.clientName}</p>
                <p className="text-xs text-slate-400 capitalize">{pool.type}</p>
              </div>
            </div>
            <div className="space-y-2">
              {pool.clientPhone && (
                <a href={`tel:${pool.clientPhone}`} className="flex items-center gap-2 text-sm text-pool-600 hover:underline">
                  <Phone className="w-3.5 h-3.5" /> {pool.clientPhone}
                </a>
              )}
              {pool.clientEmail && (
                <a href={`mailto:${pool.clientEmail}`} className="flex items-center gap-2 text-sm text-pool-600 hover:underline">
                  <Mail className="w-3.5 h-3.5" /> {pool.clientEmail}
                </a>
              )}
            </div>
            <button
              onClick={copyPortalLink}
              className="mt-4 w-full btn-outline text-xs py-2 flex items-center justify-center gap-2"
            >
              <Link2 className="w-3.5 h-3.5" />
              {copiedPortal ? "Link copied!" : "Copy Client Portal Link"}
            </button>
          </div>

          {/* Pool specs */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-4">Pool Specs</h2>
            <div className="space-y-2.5">
              {[
                { label: "Volume", value: pool.volumeGallons ? `${pool.volumeGallons.toLocaleString()} gal` : "—" },
                { label: "Monthly Rate", value: pool.monthlyRate ? `$${pool.monthlyRate}/mo` : "—" },
                { label: "Service Days", value: pool.serviceDay ?? "—" },
                { label: "Type", value: pool.type ?? "—" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{s.label}</span>
                  <span className="font-medium text-slate-900 capitalize">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {pool.notes && (
            <div className="card p-5">
              <h2 className="font-bold text-slate-900 mb-3">Notes</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{pool.notes}</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Latest chemistry */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Latest Chemistry</h2>
              <div className="flex items-center gap-2">
                {chemStatus === "good" ? (
                  <span className="badge-green flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Balanced</span>
                ) : (
                  <span className="badge-red flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Attention Needed</span>
                )}
                <Link href={`/chemistry?pool=${pool.id}`}>
                  <button className="text-xs text-pool-600 hover:underline">Update →</button>
                </Link>
              </div>
            </div>

            {latest ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Free Chlorine", value: latest.freeChlorine, unit: "ppm", min: 1, max: 4 },
                  { label: "pH", value: latest.ph, unit: "", min: 7.2, max: 7.6 },
                  { label: "Total Alkalinity", value: latest.totalAlkalinity, unit: "ppm", min: 80, max: 120 },
                  { label: "Water Temp", value: latest.waterTemp, unit: "°F", min: 0, max: 999 },
                ].filter((m) => m.value !== null).map((m) => (
                  <div key={m.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">{m.label}</p>
                    <p className={`text-lg ${CHEM_STATUS(m.value, m.min, m.max)}`}>{m.value}</p>
                    <p className="text-xs text-slate-400">{m.unit}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No chemistry readings recorded yet.</p>
            )}

            {latest && (
              <p className="text-xs text-slate-400 mt-3">
                Recorded {new Date(latest.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </div>

          {/* Chemistry history */}
          {readings?.length > 1 && (
            <div className="card p-5">
              <h2 className="font-bold text-slate-900 mb-4">Reading History</h2>
              <div className="space-y-2">
                {readings.map((r: any, i: number) => (
                  <div key={r.id} className={`flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 ${i === 0 ? "opacity-100" : "opacity-70"}`}>
                    <div className="text-xs text-slate-400 w-28 flex-shrink-0">
                      {new Date(r.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    {[
                      { label: "Cl", val: r.freeChlorine, min: 1, max: 4 },
                      { label: "pH", val: r.ph, min: 7.2, max: 7.6 },
                      { label: "TA", val: r.totalAlkalinity, min: 80, max: 120 },
                    ].map((m) => m.val !== null && (
                      <div key={m.label} className="text-xs">
                        <span className="text-slate-400">{m.label}: </span>
                        <span className={m.val >= m.min && m.val <= m.max ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                          {m.val}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Service History</h2>
              <Link href={`/reports?pool=${pool.id}`}>
                <button className="text-xs text-pool-600 hover:underline">View all →</button>
              </Link>
            </div>
            <div className="space-y-3">
              {reports?.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {r.status === "sent" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(r.servicedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      {r.issuesFound && (
                        <p className="text-xs text-amber-600">⚠ {r.issuesFound}</p>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/api/reports/${r.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-pool-600 hover:underline font-medium"
                  >
                    PDF →
                  </a>
                </div>
              ))}
              {(!reports || reports.length === 0) && (
                <p className="text-sm text-slate-400">No service reports yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
