"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatePool } from "@/hooks/useData";
import { Waves, MapPin, ArrowLeft, Loader2 } from "lucide-react";

const SERVICE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Mon/Thu", "Tue/Fri", "Mon/Wed/Fri", "Daily"];

export default function NewPoolPage() {
  const router = useRouter();
  const { mutateAsync: createPool, isPending } = useCreatePool();

  const [form, setForm] = useState({
    name: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    address: "",
    type: "residential",
    volumeGallons: "",
    monthlyRate: "",
    serviceDay: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Pool name is required";
    if (!form.clientName.trim()) e.clientName = "Client name is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (form.clientEmail && !/^[^@]+@[^@]+\.[^@]+$/.test(form.clientEmail)) {
      e.clientEmail = "Enter a valid email";
    }
    if (form.volumeGallons && isNaN(Number(form.volumeGallons))) {
      e.volumeGallons = "Must be a number";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await createPool(form);
      setSuccess(true);
      setTimeout(() => router.push("/pools"), 1200);
    } catch (err: any) {
      setErrors({ _form: err.message ?? "Something went wrong" });
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 animate-fade-in">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Pool Added!</h2>
        <p className="text-slate-500 text-sm">Redirecting to your pool list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-outline py-1.5 px-3 text-sm">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add New Pool</h1>
          <p className="text-slate-500 text-sm">Fill in the pool and client details</p>
        </div>
      </div>

      {errors._form && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {errors._form}
        </div>
      )}

      <div className="space-y-5">
        {/* Pool details */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Waves className="w-4 h-4 text-pool-600" />
            <h2 className="font-bold text-slate-900">Pool Details</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Pool Name <span className="text-red-500">*</span></label>
              <input
                className={`input ${errors.name ? "border-red-400 focus:ring-red-300" : ""}`}
                placeholder="e.g. Johnson Residence, Park Estates HOA"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="label">Pool Type</label>
              <select className="input" value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="hoa">HOA</option>
              </select>
            </div>

            <div>
              <label className="label">Volume (gallons)</label>
              <input
                className={`input ${errors.volumeGallons ? "border-red-400" : ""}`}
                type="number"
                placeholder="15000"
                value={form.volumeGallons}
                onChange={(e) => set("volumeGallons", e.target.value)}
              />
              {errors.volumeGallons && <p className="text-xs text-red-500 mt-1">{errors.volumeGallons}</p>}
            </div>

            <div>
              <label className="label">Monthly Rate ($)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  className="input pl-7"
                  type="number"
                  placeholder="150"
                  value={form.monthlyRate}
                  onChange={(e) => set("monthlyRate", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Service Day</label>
              <select className="input" value={form.serviceDay} onChange={(e) => set("serviceDay", e.target.value)}>
                <option value="">Select day...</option>
                {SERVICE_DAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-pool-600" />
            <h2 className="font-bold text-slate-900">Location</h2>
          </div>

          <div>
            <label className="label">Street Address <span className="text-red-500">*</span></label>
            <input
              className={`input ${errors.address ? "border-red-400" : ""}`}
              placeholder="1420 Maple Dr, Scottsdale, AZ 85251"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>
        </div>

        {/* Client info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 mb-2">Client Information</h2>

          <div>
            <label className="label">Client Name <span className="text-red-500">*</span></label>
            <input
              className={`input ${errors.clientName ? "border-red-400" : ""}`}
              placeholder="Mike Johnson"
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
            />
            {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                className={`input ${errors.clientEmail ? "border-red-400" : ""}`}
                type="email"
                placeholder="client@email.com"
                value={form.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
              />
              {errors.clientEmail && <p className="text-xs text-red-500 mt-1">{errors.clientEmail}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                type="tel"
                placeholder="(480) 555-0100"
                value={form.clientPhone}
                onChange={(e) => set("clientPhone", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Gate code, dog in yard, special instructions..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => router.back()} className="btn-outline flex-1">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex-1">
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              "Add Pool"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
