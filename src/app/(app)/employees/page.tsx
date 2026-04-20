"use client";

import { useState } from "react";
import { Users, Plus, Phone, Mail, Star, Loader2 } from "lucide-react";
import { useEmployees, useCreateEmployee } from "@/hooks/useData";

const AVATAR_COLORS = [
  "from-pool-500 to-[#00c3e3]",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-500",
];

const ROLES = ["Technician", "Lead Technician", "Part-time Tech", "Manager"];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function EmployeesPage() {
  const { data, isLoading } = useEmployees();
  const { mutateAsync: createEmployee, isPending } = useCreateEmployee();

  const employees: any[] = data?.employees ?? [];
  const active = employees.filter((e) => e.isActive !== false);

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Technician", email: "", phone: "", hourlyRate: "" });
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setError("");
    try {
      await createEmployee({
        name: form.name.trim(),
        role: form.role.toLowerCase().replace(/ /g, "_"),
        email: form.email || null,
        phone: form.phone || null,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
      });
      setForm({ name: "", role: "Technician", email: "", phone: "", hourlyRate: "" });
      setShowNew(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to add employee");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? "Loading..." : `${active.length} active technician${active.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-pool-500" />
        </div>
      )}

      {!isLoading && employees.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No employees yet</p>
          <p className="text-sm mt-1">Add your first team member</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-4">+ Add Employee</button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {employees.map((emp, i) => (
          <div key={emp.id} className="card p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {initials(emp.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{emp.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{(emp.role ?? "technician").replace(/_/g, " ")}</p>
                  </div>
                  <span className={`badge ${emp.isActive !== false ? "badge-green" : "badge-slate"}`}>
                    {emp.isActive !== false ? "active" : "inactive"}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {emp.phone && (
                    <a href={`tel:${emp.phone}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-pool-600">
                      <Phone className="w-3 h-3" />{emp.phone}
                    </a>
                  )}
                  {emp.email && (
                    <a href={`mailto:${emp.email}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-pool-600">
                      <Mail className="w-3 h-3" />{emp.email}
                    </a>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {emp.hourlyRate && (
                      <div>
                        <p className="text-xs text-slate-400">Rate</p>
                        <p className="text-sm font-bold text-slate-900">${emp.hourlyRate}/hr</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-outline text-xs py-1 px-2.5">Edit</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-slate-900 text-lg mb-4">Add Employee</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm mb-4">{error}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input className="input" placeholder="Jane Smith" value={form.name} onChange={set("name")} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={set("role")}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="jane@company.com" value={form.email} onChange={set("email")} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" type="tel" placeholder="(480) 555-0000" value={form.phone} onChange={set("phone")} />
              </div>
              <div>
                <label className="label">Hourly Rate (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input className="input pl-6" type="number" placeholder="22.00" value={form.hourlyRate} onChange={set("hourlyRate")} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNew(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleAdd} disabled={isPending} className="btn-primary flex-1">
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : "Add Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
