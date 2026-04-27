"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePool, useEquipment, useCreateEquipment, useDeleteEquipment, useAquaLink, useAquaLinkControl } from "@/hooks/useData";
import {
  ArrowLeft, Waves, Phone, Mail, MapPin, FlaskConical,
  FileText, AlertTriangle, CheckCircle2, Clock, Link2,
  Wrench, Plus, Trash2, Zap, Thermometer, Droplets, Wind,
  Power, Settings2, Camera, X, Loader2, ClipboardList, RefreshCw,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef } from "react";

const EMPTY = { pool: null, readings: [], reports: [] };

const CHEM_STATUS = (val: number | null, min: number, max: number) => {
  if (val === null) return "text-slate-400";
  return val >= min && val <= max ? "text-emerald-600 font-bold" : "text-red-600 font-bold";
};

const EQUIPMENT_CATEGORIES = [
  { value: "pump",      label: "Pump",        icon: "🔄" },
  { value: "filter",   label: "Filter",       icon: "🫧" },
  { value: "heater",   label: "Heater",       icon: "🔥" },
  { value: "salt_cell",label: "Salt Cell",    icon: "🧂" },
  { value: "light",    label: "Light",        icon: "💡" },
  { value: "cleaner",  label: "Auto Cleaner", icon: "🤖" },
  { value: "other",    label: "Other",        icon: "🔧" },
];

type TabType = "overview" | "equipment" | "aqualink" | "tasks" | "notes";

// ── AquaLink Panel ─────────────────────────────────────────────────────────────
function AquaLinkPanel({ poolId }: { poolId: number }) {
  const { data, isLoading, refetch } = useAquaLink(poolId);
  const control = useAquaLinkControl();
  const [connecting, setConnecting] = useState(false);
  const [creds, setCreds] = useState({ username: "", password: "" });
  const [connectError, setConnectError] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);

  const handleConnect = async () => {
    if (!creds.username || !creds.password) return;
    setConnectLoading(true);
    setConnectError("");
    try {
      const res = await fetch("/api/aqualink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId, ...creds }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setConnecting(false);
      refetch();
    } catch (e: any) {
      setConnectError(e.message ?? "Connection failed");
    } finally {
      setConnectLoading(false);
    }
  };

  const handleControl = (deviceId: string, state: boolean, value?: number) => {
    control.mutate({ poolId, deviceId, state, value });
  };

  const handleDisconnect = async () => {
    await fetch(`/api/aqualink?poolId=${poolId}`, { method: "DELETE" });
    refetch();
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  // Not connected
  if (!data?.connected) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">Connect Jandy iAquaLink</p>
          <p className="text-xs text-blue-700">
            Link this pool's automation system to view real-time status, control pumps, heaters, and lights directly from PoolPal AI — for both you and the homeowner.
          </p>
        </div>

        {connecting ? (
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-slate-900">iAquaLink Credentials</h3>
            <div>
              <label className="label">iAquaLink Email</label>
              <input type="email" className="input" placeholder="owner@email.com"
                value={creds.username} onChange={e => setCreds(p => ({...p, username: e.target.value}))} />
            </div>
            <div>
              <label className="label">iAquaLink Password</label>
              <input type="password" className="input" placeholder="••••••••"
                value={creds.password} onChange={e => setCreds(p => ({...p, password: e.target.value}))} />
            </div>
            {connectError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{connectError}</p>}
            <div className="flex gap-2">
              <button onClick={handleConnect} disabled={connectLoading} className="btn-primary flex-1">
                {connectLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Connect"}
              </button>
              <button onClick={() => setConnecting(false)} className="btn-secondary">Cancel</button>
            </div>
            <p className="text-xs text-slate-400">Credentials are used only to get a session token. Your password is never stored.</p>
          </div>
        ) : (
          <button onClick={() => setConnecting(true)} className="btn-primary w-full flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> Connect iAquaLink System
          </button>
        )}

        <div className="text-center">
          <p className="text-xs text-slate-400">Also compatible with Pentair ScreenLogic and Hayward OmniLogic — coming soon.</p>
        </div>
      </div>
    );
  }

  // Connected — show status and controls
  const status = data.status;
  const devices: any[] = status?.devices ?? [];

  const pumps    = devices.filter((d: any) => d.device_type === "pump" || d.name?.toLowerCase().includes("pump"));
  const heaters  = devices.filter((d: any) => d.device_type === "heater" || d.name?.toLowerCase().includes("heat"));
  const lights   = devices.filter((d: any) => d.device_type === "light" || d.name?.toLowerCase().includes("light"));
  const others   = devices.filter((d: any) => !pumps.includes(d) && !heaters.includes(d) && !lights.includes(d));

  const DeviceRow = ({ device, icon }: { device: any; icon: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-sm font-medium text-slate-900">{device.name}</p>
          {device.set_point && <p className="text-xs text-slate-400">Set: {device.set_point}°F</p>}
        </div>
      </div>
      <button
        onClick={() => handleControl(String(device.id), !device.state)}
        disabled={control.isPending}
        className={`relative w-12 h-6 rounded-full transition-colors ${device.state ? "bg-emerald-500" : "bg-slate-200"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${device.state ? "translate-x-6" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            {data.systemName}
          </p>
          {data.lastSyncAt && (
            <p className="text-xs text-slate-400">Updated {new Date(data.lastSyncAt).toLocaleTimeString()}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary text-xs py-1.5 px-3">Refresh</button>
          <button onClick={handleDisconnect} className="text-xs text-red-500 hover:text-red-700 px-2">Disconnect</button>
        </div>
      </div>

      {/* Water temp + status */}
      {status?.temp && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Thermometer className="w-4 h-4" />, label: "Water Temp", value: `${status.temp}°F`, color: "text-blue-600" },
            { icon: <Droplets className="w-4 h-4" />,    label: "Air Temp",   value: status.air_temp ? `${status.air_temp}°F` : "—", color: "text-slate-600" },
            { icon: <Wind className="w-4 h-4" />,        label: "System",     value: status.status ?? "On", color: "text-emerald-600" },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Device controls */}
      {devices.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No controllable devices found on this system.</div>
      ) : (
        <div className="card p-4">
          {pumps.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pumps</p>
              {pumps.map((d: any) => <DeviceRow key={d.id} device={d} icon="🔄" />)}
            </div>
          )}
          {heaters.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Heaters</p>
              {heaters.map((d: any) => <DeviceRow key={d.id} device={d} icon="🔥" />)}
            </div>
          )}
          {lights.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lights</p>
              {lights.map((d: any) => <DeviceRow key={d.id} device={d} icon="💡" />)}
            </div>
          )}
          {others.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Other</p>
              {others.map((d: any) => <DeviceRow key={d.id} device={d} icon="⚙️" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Equipment Panel ────────────────────────────────────────────────────────────
function EquipmentPanel({ poolId }: { poolId: number }) {
  const { data, isLoading } = useEquipment(poolId);
  const createEquipment = useCreateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const equipment: any[] = data?.equipment ?? [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "pump", brand: "", model: "", serialNumber: "", installedAt: "", warrantyExp: "", lastServicedAt: "", serviceIntervalDays: "", notes: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleAdd = async () => {
    await createEquipment.mutateAsync({ poolId, ...form });
    setForm({ category: "pump", brand: "", model: "", serialNumber: "", installedAt: "", warrantyExp: "", lastServicedAt: "", serviceIntervalDays: "", notes: "" });
    setShowForm(false);
  };

  const markServiced = async (id: number) => {
    await fetch("/api/equipment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, lastServicedAt: new Date().toISOString() }),
    });
    // Invalidate equipment cache
    window.location.reload();
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{equipment.length} item{equipment.length !== 1 ? "s" : ""} tracked</p>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Equipment
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4 border-2 border-pool-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Add Equipment</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={set("category")}>
                {EQUIPMENT_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Brand</label>
              <input className="input" placeholder="Pentair, Hayward…" value={form.brand} onChange={set("brand")} />
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" placeholder="SuperFlo VS" value={form.model} onChange={set("model")} />
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input className="input" placeholder="SN-123456" value={form.serialNumber} onChange={set("serialNumber")} />
            </div>
            <div>
              <label className="label">Install Date</label>
              <input type="date" className="input" value={form.installedAt} onChange={set("installedAt")} />
            </div>
            <div>
              <label className="label">Warranty Expires</label>
              <input type="date" className="input" value={form.warrantyExp} onChange={set("warrantyExp")} />
            </div>
            <div>
              <label className="label">Last Serviced</label>
              <input type="date" className="input" value={form.lastServicedAt} onChange={set("lastServicedAt")} />
            </div>
            <div>
              <label className="label">Service Interval (days)</label>
              <input type="number" className="input" placeholder="90" value={form.serviceIntervalDays} onChange={set("serviceIntervalDays")} />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} placeholder="Any service notes…" value={form.notes} onChange={set("notes")} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={createEquipment.isPending} className="btn-primary flex-1">
              {createEquipment.isPending ? "Saving…" : "Save Equipment"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {equipment.length === 0 && !showForm ? (
        <div className="text-center py-12 text-slate-400">
          <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No equipment tracked yet</p>
          <p className="text-xs mt-1">Add pumps, filters, heaters, and salt cells to track warranty and service history.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equipment.map((item: any) => {
            const cat = EQUIPMENT_CATEGORIES.find(c => c.value === item.category);
            const warrantyExp = item.warrantyExp || item.warranty_exp ? new Date(item.warrantyExp || item.warranty_exp) : null;
            const warrantyExpired = warrantyExp && warrantyExp < new Date();
            const warrantyDays = warrantyExp ? Math.ceil((warrantyExp.getTime() - Date.now()) / 86400000) : null;

            const lastServiced    = item.lastServicedAt || item.last_serviced_at ? new Date(item.lastServicedAt || item.last_serviced_at) : null;
            const intervalDays    = item.serviceIntervalDays || item.service_interval_days ? parseInt(item.serviceIntervalDays || item.service_interval_days) : null;
            const nextServiceDate = lastServiced && intervalDays ? new Date(lastServiced.getTime() + intervalDays * 86400000) : null;
            const serviceDaysLeft = nextServiceDate ? Math.ceil((nextServiceDate.getTime() - Date.now()) / 86400000) : null;
            const serviceOverdue  = serviceDaysLeft !== null && serviceDaysLeft < 0;

            return (
              <div key={item.id} className={`card p-4 flex gap-4 ${serviceOverdue ? "border-red-300 bg-red-50" : ""}`}>
                <div className="text-2xl flex-shrink-0">{cat?.icon ?? "🔧"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900">{item.brand} {item.model}</p>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{cat?.label ?? item.category}</span>
                    {serviceOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Service Overdue</span>}
                    {serviceDaysLeft !== null && !serviceOverdue && serviceDaysLeft <= 14 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Due Soon</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {item.serialNumber && <span>SN: {item.serialNumber}</span>}
                    {item.installedAt && <span>Installed: {new Date(item.installedAt).toLocaleDateString()}</span>}
                    {warrantyExp && (
                      <span className={warrantyExpired ? "text-red-500 font-medium" : warrantyDays! < 90 ? "text-amber-500 font-medium" : ""}>
                        Warranty: {warrantyExpired ? "Expired" : `${warrantyDays}d left`} ({warrantyExp.toLocaleDateString()})
                      </span>
                    )}
                    {nextServiceDate && (
                      <span className={serviceOverdue ? "text-red-500 font-medium" : serviceDaysLeft! <= 14 ? "text-amber-500 font-medium" : ""}>
                        Next service: {serviceOverdue ? `${Math.abs(serviceDaysLeft!)}d overdue` : `in ${serviceDaysLeft}d`} ({nextServiceDate.toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  {item.notes && <p className="text-xs text-slate-500 mt-1.5 italic">{item.notes}</p>}
                  {(serviceOverdue || (serviceDaysLeft !== null && serviceDaysLeft <= 14)) && (
                    <button onClick={() => markServiced(item.id)} className="mt-2 text-xs btn-outline py-1 px-3">
                      ✓ Mark Serviced Today
                    </button>
                  )}
                </div>
                <button
                  onClick={() => deleteEquipment.mutate({ id: item.id, poolId })}
                  className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Service Tasks Panel ────────────────────────────────────────────────────────
function TasksPanel({ poolId }: { poolId: number }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pool-tasks", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/pools/tasks?poolId=${poolId}`);
      if (!res.ok) throw new Error("Failed to load tasks");
      return res.json();
    },
    enabled: !!poolId,
  });

  const qc = useQueryClient();
  const completeTask = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch("/api/pools/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, completedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to complete task");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pool-tasks", poolId] }),
  });

  const tasks: any[] = data?.tasks ?? [];
  const overdue  = tasks.filter((t: any) => t.daysUntilDue < 0);
  const dueSoon  = tasks.filter((t: any) => t.daysUntilDue >= 0 && t.daysUntilDue <= 7);
  const upcoming = tasks.filter((t: any) => t.daysUntilDue > 7);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const TaskRow = ({ task }: { task: any }) => {
    const isOverdue = task.daysUntilDue < 0;
    const isSoon    = task.daysUntilDue >= 0 && task.daysUntilDue <= 7;
    return (
      <div className={`flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 ${isOverdue ? "bg-red-50 -mx-4 px-4" : ""}`}>
        <span className="text-lg flex-shrink-0">{task.icon ?? "📋"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{task.name}</p>
          <p className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : isSoon ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
            {isOverdue
              ? `${Math.abs(task.daysUntilDue)} days overdue`
              : task.daysUntilDue === 0
              ? "Due today"
              : `Due in ${task.daysUntilDue} days`}
            {" · "}{task.category}
          </p>
        </div>
        <button
          onClick={() => completeTask.mutate(task.id)}
          disabled={completeTask.isPending}
          className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0"
        >
          ✓ Done
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{tasks.length} scheduled maintenance tasks</p>
        <button onClick={() => refetch()} className="text-xs text-pool-600 hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {overdue.length > 0 && (
        <div className="card overflow-hidden">
          <div className="bg-red-50 px-4 py-2 border-b border-red-100">
            <p className="text-xs font-bold text-red-700">⚠ Overdue ({overdue.length})</p>
          </div>
          <div className="px-4">{overdue.map((t: any) => <TaskRow key={t.id} task={t} />)}</div>
        </div>
      )}

      {dueSoon.length > 0 && (
        <div className="card overflow-hidden">
          <div className="bg-amber-50 px-4 py-2 border-b border-amber-100">
            <p className="text-xs font-bold text-amber-700">Due this week ({dueSoon.length})</p>
          </div>
          <div className="px-4">{dueSoon.map((t: any) => <TaskRow key={t.id} task={t} />)}</div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="card overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500">Upcoming ({upcoming.length})</p>
          </div>
          <div className="px-4">{upcoming.map((t: any) => <TaskRow key={t.id} task={t} />)}</div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No tasks scheduled</p>
          <p className="text-xs mt-1">Tasks are auto-generated when you first view a pool.</p>
        </div>
      )}
    </div>
  );
}

// ── Notes Panel ───────────────────────────────────────────────────────────────
const NOTE_TYPES = [
  { value: "note",  label: "Note",  icon: "📝" },
  { value: "call",  label: "Call",  icon: "📞" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "sms",   label: "SMS",   icon: "💬" },
];

function NotesPanel({ poolId }: { poolId: number }) {
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [saving, setSaving] = useState(false);
  const [tableError, setTableError] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pool-notes", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/pools/notes?poolId=${poolId}`);
      return res.json();
    },
    enabled: !!poolId,
  });

  const notes: any[] = data?.notes ?? [];

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pools/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId, note: noteText.trim(), type: noteType }),
      });
      const d = await res.json();
      if (d.error && d.sql) {
        setTableError(true);
        setSaving(false);
        return;
      }
      setNoteText("");
      refetch();
      qc.invalidateQueries({ queryKey: ["pool-notes", poolId] });
    } catch {}
    setSaving(false);
  };

  const deleteNote = async (id: number) => {
    await fetch(`/api/pools/notes?id=${id}`, { method: "DELETE" });
    refetch();
  };

  if (tableError) {
    return (
      <div className="card p-5 bg-amber-50 border-amber-200">
        <p className="font-semibold text-amber-900 mb-2">One-time setup required</p>
        <p className="text-sm text-amber-700 mb-3">Run this SQL in your Neon console to enable client notes:</p>
        <code className="block bg-white border border-amber-200 rounded-xl px-4 py-3 text-xs text-slate-700 break-all select-all">
          {"CREATE TABLE IF NOT EXISTS client_notes (id SERIAL PRIMARY KEY, pool_id INTEGER NOT NULL REFERENCES pools(id), author_id TEXT, note TEXT NOT NULL, type TEXT DEFAULT 'note', created_at TIMESTAMP DEFAULT NOW());"}
        </code>
        <button onClick={() => setTableError(false)} className="btn-outline mt-3 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <div className="card p-5 space-y-3">
        <div className="flex gap-2">
          {NOTE_TYPES.map(t => (
            <button key={t.value} onClick={() => setNoteType(t.value)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all ${noteType === t.value ? "bg-pool-500 text-white border-pool-500" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="Add a note about this client or pool…"
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
        />
        <button onClick={addNote} disabled={saving || !noteText.trim()} className="btn-primary w-full text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add Note"}
        </button>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : notes.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notes yet — add your first one above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n: any) => {
            const typeInfo = NOTE_TYPES.find(t => t.value === n.type) ?? NOTE_TYPES[0];
            return (
              <div key={n.id} className="card p-4 flex gap-3">
                <span className="text-lg flex-shrink-0">{typeInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 leading-relaxed">{n.note}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {typeInfo.label} · {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={() => deleteNote(n.id)} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PoolDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { company } = useAuth();
  const { data, isLoading } = usePool(parseInt(id as string));
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [tab, setTab] = useState<TabType>("overview");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("poolId", id as string);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.url) alert(`Photo uploaded: ${d.url}`);
    } catch {}
    setUploadingPhoto(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const { pool, readings, reports } = data ?? EMPTY;
  const latest = readings?.[0];

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-64"><div className="w-8 h-8 border-2 border-pool-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!pool) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3">
        <Waves className="w-10 h-10 text-slate-300" />
        <p className="text-slate-500 font-medium">Pool not found</p>
        <button onClick={() => router.back()} className="btn-secondary text-sm">← Go back</button>
      </div>
    );
  }

  const chemStatus =
    latest &&
    latest.freeChlorine >= 1 && latest.freeChlorine <= 4 &&
    latest.ph >= 7.2 && latest.ph <= 7.6
      ? "good" : "needs-attention";

  const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "overview",  label: "Overview",  icon: <Waves className="w-4 h-4" /> },
    { id: "tasks",     label: "Tasks",     icon: <ClipboardList className="w-4 h-4" /> },
    { id: "equipment", label: "Equipment", icon: <Wrench className="w-4 h-4" /> },
    { id: "notes",     label: "Notes",     icon: <FileText className="w-4 h-4" /> },
    { id: "aqualink",  label: "AquaLink",  icon: <Zap className="w-4 h-4" /> },
  ];

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
        <div className="flex gap-2 flex-wrap justify-end">
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} className="btn-secondary text-sm flex items-center gap-1.5">
            {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {uploadingPhoto ? "Uploading…" : "Photo"}
          </button>
          <Link href={`/chemistry?pool=${pool.id}`}>
            <button className="btn-secondary text-sm"><FlaskConical className="w-4 h-4" /> Chemistry</button>
          </Link>
          <Link href={`/reports?pool=${pool.id}`}>
            <button className="btn-primary text-sm"><FileText className="w-4 h-4" /> New Report</button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <TasksPanel poolId={pool.id} />
      )}

      {tab === "equipment" && (
        <EquipmentPanel poolId={pool.id} />
      )}

      {tab === "notes" && (
        <NotesPanel poolId={pool.id} />
      )}

      {tab === "aqualink" && (
        <AquaLinkPanel poolId={pool.id} />
      )}

      {tab === "overview" && (
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
              <button onClick={copyPortalLink} className="mt-4 w-full btn-outline text-xs py-2 flex items-center justify-center gap-2">
                <Link2 className="w-3.5 h-3.5" />
                {copiedPortal ? "Link copied!" : "Copy Client Portal Link"}
              </button>
            </div>

            {/* Pool specs */}
            <div className="card p-5">
              <h2 className="font-bold text-slate-900 mb-4">Pool Specs</h2>
              <div className="space-y-2.5">
                {[
                  { label: "Volume",       value: pool.volumeGallons ? `${pool.volumeGallons.toLocaleString()} gal` : "—" },
                  { label: "Monthly Rate", value: pool.monthlyRate ? `$${pool.monthlyRate}/mo` : "—" },
                  { label: "Service Days", value: pool.serviceDay ?? "—" },
                  { label: "Type",         value: pool.type ?? "—" },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{s.label}</span>
                    <span className="font-medium text-slate-900 capitalize">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {pool.notes && (
              <div className="card p-5">
                <h2 className="font-bold text-slate-900 mb-3">Notes</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{pool.notes}</p>
              </div>
            )}

            {/* Quick links to other tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setTab("tasks")} className="card p-3 text-center hover:border-pool-300 transition-colors cursor-pointer">
                <ClipboardList className="w-5 h-5 text-pool-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-700">Tasks</p>
              </button>
              <button onClick={() => setTab("equipment")} className="card p-3 text-center hover:border-pool-300 transition-colors cursor-pointer">
                <Wrench className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-700">Equipment</p>
              </button>
              <button onClick={() => setTab("aqualink")} className="card p-3 text-center hover:border-pool-300 transition-colors cursor-pointer">
                <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-700">AquaLink</p>
              </button>
            </div>
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

              {latest?.aiDosageRecommendation && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-pool-700 mb-1">Last AI Dosage Recommendation</p>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{latest.aiDosageRecommendation.slice(0, 300)}{latest.aiDosageRecommendation.length > 300 ? "…" : ""}</p>
                </div>
              )}

              {latest && (
                <p className="text-xs text-slate-400 mt-3">
                  Recorded {new Date(latest.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              )}
            </div>

            {/* Chemistry trend charts */}
            {readings?.length > 1 && (
              <div className="card p-5">
                <h2 className="font-bold text-slate-900 mb-4">Chemistry Trends</h2>
                {(() => {
                  const chartData = [...readings].reverse().slice(-12).map((r: any) => ({
                    date: new Date(r.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    cl:   r.freeChlorine   !== null ? parseFloat(r.freeChlorine)   : undefined,
                    ph:   r.ph             !== null ? parseFloat(r.ph)             : undefined,
                    ta:   r.totalAlkalinity !== null ? parseFloat(r.totalAlkalinity) : undefined,
                  }));
                  const charts = [
                    { key: "cl", label: "Free Chlorine (ppm)", color: "#0ea5e9", min: 1,  max: 4,   domainMin: 0,  domainMax: 6   },
                    { key: "ph", label: "pH",                  color: "#8b5cf6", min: 7.2, max: 7.6, domainMin: 6.5,domainMax: 8.5 },
                    { key: "ta", label: "Total Alkalinity",    color: "#f59e0b", min: 80,  max: 120,  domainMin: 40, domainMax: 200 },
                  ].filter(c => chartData.some(d => (d as any)[c.key] !== undefined));
                  return (
                    <div className="space-y-5">
                      {charts.map(c => (
                        <div key={c.key}>
                          <p className="text-xs font-semibold text-slate-500 mb-2">{c.label}</p>
                          <ResponsiveContainer width="100%" height={110}>
                            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                              <YAxis domain={[c.domainMin, c.domainMax]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                              <Tooltip
                                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                                formatter={(v: any) => [v, c.label]}
                              />
                              <ReferenceLine y={c.min} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} />
                              <ReferenceLine y={c.max} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} />
                              <Line
                                type="monotone" dataKey={c.key} stroke={c.color}
                                strokeWidth={2} dot={{ r: 3, fill: c.color }} connectNulls
                              />
                            </LineChart>
                          </ResponsiveContainer>
                          <p className="text-[10px] text-slate-400 mt-0.5">Target range: {c.min}–{c.max} (dashed lines)</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Service reports with photos */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">Service History</h2>
                <Link href={`/reports?pool=${pool.id}`}>
                  <button className="text-xs text-pool-600 hover:underline">View all →</button>
                </Link>
              </div>
              <div className="space-y-3">
                {reports?.slice(0, 5).map((r: any) => {
                  const photos: string[] = r.photos ? JSON.parse(r.photos).filter(Boolean) : [];
                  return (
                    <div key={r.id} className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          {r.status === "sent" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {new Date(r.servicedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                            {r.chemicalsUsed && (
                              <p className="text-xs text-pool-600">🧪 {r.chemicalsUsed}</p>
                            )}
                            {r.issuesFound && (
                              <p className="text-xs text-amber-600">⚠ {r.issuesFound}</p>
                            )}
                          </div>
                        </div>
                        <a href={`/api/reports/${r.id}/pdf`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-pool-600 hover:underline font-medium flex-shrink-0">
                          PDF →
                        </a>
                      </div>
                      {photos.length > 0 && (
                        <div className="flex gap-2 px-3 pb-3 overflow-x-auto">
                          {photos.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Service photo ${i + 1}`}
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0 hover:opacity-90 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {(!reports || reports.length === 0) && (
                  <p className="text-sm text-slate-400">No service reports yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
