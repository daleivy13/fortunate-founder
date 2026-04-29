"use client";

import { useState } from "react";
import { Users, Plus, Phone, Mail, Star, Loader2, X, TrendingUp } from "lucide-react";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/hooks/useData";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getEffectiveLevel, getLevelLabel, getLevelColor, getDaysToNextLevel } from "@/lib/tech-experience";
import Link from "next/link";

const AVATAR_COLORS = [
  "from-pool-500 to-[#00c3e3]",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-500",
];

const ROLES = ["Technician", "Lead Technician", "Part-time Tech", "Manager"];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface EmpForm { name: string; role: string; email: string; phone: string; hourlyRate: string; }

export default function EmployeesPage() {
  const { company } = useAuth();
  const { data, isLoading } = useEmployees();
  const { mutateAsync: createEmployee, isPending } = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const { data: ratingsData } = useQuery({
    queryKey: ["ratings", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/ratings?companyId=${company!.id}`);
      return res.json();
    },
    enabled: !!company?.id,
  });

  const employees: any[] = data?.employees ?? [];
  const active = employees.filter((e) => e.isActive !== false);
  const ratingsByTech: Record<string, any> = {};
  for (const stat of (ratingsData?.techStats?.rows ?? [])) {
    ratingsByTech[stat.tech_id] = stat;
  }

  const [showNew,  setShowNew]  = useState(false);
  const [editing,  setEditing]  = useState<any | null>(null);
  const [form,     setForm]     = useState<EmpForm>({ name: "", role: "Technician", email: "", phone: "", hourlyRate: "" });
  const [editForm, setEditForm] = useState<EmpForm>({ name: "", role: "", email: "", phone: "", hourlyRate: "" });
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);

  const set     = (k: keyof EmpForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setEdit = (k: keyof EmpForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setEditForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setError("");
    try {
      await createEmployee({
        name:       form.name.trim(),
        role:       form.role.toLowerCase().replace(/ /g, "_"),
        email:      form.email || null,
        phone:      form.phone || null,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
      });
      setForm({ name: "", role: "Technician", email: "", phone: "", hourlyRate: "" });
      setShowNew(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to add employee");
    }
  };

  const openEdit = (emp: any) => {
    setEditForm({
      name:       emp.name ?? "",
      role:       ROLES.find((r) => r.toLowerCase().replace(/ /g, "_") === emp.role) ?? "Technician",
      email:      emp.email ?? "",
      phone:      emp.phone ?? "",
      hourlyRate: emp.hourlyRate ? String(emp.hourlyRate) : "",
    });
    setEditing(emp);
    setError("");
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) { setError("Name is required"); return; }
    setError("");
    setSaving(true);
    try {
      await updateEmployee.mutateAsync({
        id:         editing.id,
        name:       editForm.name.trim(),
        role:       editForm.role.toLowerCase().replace(/ /g, "_"),
        email:      editForm.email || null,
        phone:      editForm.phone || null,
        hourlyRate: editForm.hourlyRate || null,
      });
      setEditing(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    await deleteEmployee.mutateAsync(id);
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
          <div key={emp.id} className={`card p-5 ${emp.isActive === false ? "opacity-50" : ""}`}>
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

                {(() => {
                  const r = ratingsByTech[emp.userId];
                  if (!r) return null;
                  return (
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(parseFloat(r.avg_rating)) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
                      ))}
                      <span className="text-xs text-slate-500 ml-1">{parseFloat(r.avg_rating).toFixed(1)} ({r.total_ratings} rating{r.total_ratings !== 1 ? "s" : ""})</span>
                    </div>
                  );
                })()}

                {/* Experience level */}
                {(() => {
                  const level   = getEffectiveLevel({ id: emp.id, experienceLevel: emp.experienceLevel, startedDate: emp.startedDate, servicesCompleted: emp.servicesCompleted, equipmentTrainedOn: emp.equipmentTrainedOn });
                  const { label: progressLabel, pct } = getDaysToNextLevel({ id: emp.id, experienceLevel: emp.experienceLevel, startedDate: emp.startedDate, servicesCompleted: emp.servicesCompleted });
                  return (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getLevelColor(level)}`}>{getLevelLabel(level)}</span>
                        <span className="text-xs text-slate-400">{emp.servicesCompleted ?? 0} services</span>
                      </div>
                      {pct < 100 && (
                        <>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1756a9] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{progressLabel}</p>
                        </>
                      )}
                    </div>
                  );
                })()}

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {emp.hourlyRate && (
                      <div>
                        <p className="text-xs text-slate-400">Rate</p>
                        <p className="text-sm font-bold text-slate-900">${emp.hourlyRate}/hr</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {emp.isActive !== false && (
                      <>
                        <Link href={`/employees/${emp.id}`}>
                          <button className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Profile
                          </button>
                        </Link>
                        <button onClick={() => openEdit(emp)} className="btn-outline text-xs py-1 px-2.5">Edit</button>
                        <button
                          onClick={() => handleDeactivate(emp.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-2"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-lg">Add Employee</h2>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm mb-4">{error}</div>}

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

      {/* Edit Employee Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-lg">Edit Employee</h2>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm mb-4">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input className="input" value={editForm.name} onChange={setEdit("name")} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={editForm.role} onChange={setEdit("role")}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={editForm.email} onChange={setEdit("email")} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" type="tel" value={editForm.phone} onChange={setEdit("phone")} />
              </div>
              <div>
                <label className="label">Hourly Rate</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input className="input pl-6" type="number" placeholder="22.00" value={editForm.hourlyRate} onChange={setEdit("hourlyRate")} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
