"use client";

import { useState } from "react";
import { Users, Plus, Phone, Mail, MapPin, Star } from "lucide-react";

const EMPLOYEES = [
  { id: 1, name: "Marco Delgado", role: "Owner / Lead Tech", email: "marco@poolpal.com", phone: "(480) 555-0001", pools: 47, rating: 4.9, status: "active", avatar: "MD" },
  { id: 2, name: "James Rivera", role: "Technician", email: "james@poolpal.com", phone: "(480) 555-0002", pools: 18, rating: 4.7, status: "active", avatar: "JR" },
  { id: 3, name: "Priya Patel", role: "Technician", email: "priya@poolpal.com", phone: "(480) 555-0003", pools: 15, rating: 4.8, status: "active", avatar: "PP" },
  { id: 4, name: "Derek Monroe", role: "Part-time Tech", email: "derek@poolpal.com", phone: "(480) 555-0004", pools: 8, rating: 4.5, status: "inactive", avatar: "DM" },
];

const AVATAR_COLORS = ["from-pool-500 to-[#00c3e3]", "from-violet-500 to-purple-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-500"];

export default function EmployeesPage() {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500 text-sm mt-1">{EMPLOYEES.filter((e) => e.status === "active").length} active technicians</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {EMPLOYEES.map((emp, i) => (
          <div key={emp.id} className="card p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {emp.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{emp.name}</p>
                    <p className="text-xs text-slate-400">{emp.role}</p>
                  </div>
                  <span className={`badge ${emp.status === "active" ? "badge-green" : "badge-slate"}`}>
                    {emp.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <a href={`tel:${emp.phone}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-pool-600">
                    <Phone className="w-3 h-3" />{emp.phone}
                  </a>
                  <a href={`mailto:${emp.email}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-pool-600">
                    <Mail className="w-3 h-3" />{emp.email}
                  </a>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Pools</p>
                      <p className="text-sm font-bold text-slate-900">{emp.pools}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Rating</p>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {emp.rating}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs py-1 px-2.5">View Routes</button>
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
            <div className="space-y-3">
              <div><label className="label">Full Name</label><input className="input" placeholder="Jane Smith" /></div>
              <div><label className="label">Role</label>
                <select className="input">
                  <option>Technician</option>
                  <option>Lead Technician</option>
                  <option>Part-time Tech</option>
                  <option>Manager</option>
                </select>
              </div>
              <div><label className="label">Email</label><input className="input" type="email" placeholder="jane@company.com" /></div>
              <div><label className="label">Phone</label><input className="input" type="tel" placeholder="(480) 555-0000" /></div>
              <div><label className="label">Hourly Rate (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input className="input pl-6" type="number" placeholder="22.00" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNew(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={() => setShowNew(false)} className="btn-primary flex-1">Add Employee</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
