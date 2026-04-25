"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Waves, FlaskConical, MapPin,
  FileText, Users, Receipt, BarChart3, LogOut,
  Settings, Bell, ChevronRight, Menu, X, Package, Upload, Gift, Wrench,
} from "lucide-react";
import OfflineBanner from "@/components/OfflineBanner";

const NAV = [
  { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard, group: "main" },
  { href: "/pools",      label: "Pools",        icon: Waves,           group: "main" },
  { href: "/chemistry",  label: "Chemistry AI", icon: FlaskConical,    group: "main" },
  { href: "/routes",     label: "Routes & GPS", icon: MapPin,          group: "main" },
  { href: "/reports",    label: "Reports",      icon: FileText,        group: "main" },
  { href: "/inventory",  label: "Inventory",    icon: Package,         group: "main" },
  { href: "/work-orders",label: "Work Orders",  icon: Wrench,          group: "business" },
  { href: "/invoices",   label: "Invoices",     icon: Receipt,         group: "business" },
  { href: "/employees",  label: "Employees",    icon: Users,           group: "business" },
  { href: "/analytics",  label: "Analytics",    icon: BarChart3,       group: "business" },
  { href: "/referral",   label: "Refer & Earn", icon: Gift,            group: "business" },
  { href: "/import",     label: "Import",       icon: Upload,          group: "business" },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, company, signOut } = useAuth();
  const pathname = usePathname();

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0].toUpperCase() ?? "U";

  const mainNav  = NAV.filter((n) => n.group === "main");
  const bizNav   = NAV.filter((n) => n.group === "business");

  const NavItem = ({ item }: { item: typeof NAV[0] }) => {
    const active = pathname.startsWith(item.href);
    return (
      <Link href={item.href} onClick={onClose}>
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group ${
          active
            ? "bg-[#e8f1fc] text-[#1756a9]"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        }`}>
          <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-[#1756a9]" : "text-slate-400 group-hover:text-slate-600"}`} />
          <span className="flex-1">{item.label}</span>
          {active && <ChevronRight className="w-3 h-3 text-pool-400" />}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100 flex-shrink-0">
        <div className="w-8 h-8 bg-gradient-to-br from-pool-500 to-[#00c3e3] rounded-xl flex items-center justify-center flex-shrink-0">
          <Waves className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-pool-900 text-sm leading-none">PoolPal AI</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">{company?.name ?? "Pool Service Platform"}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <div className="mb-4">
          {mainNav.map((item) => <NavItem key={item.href} item={item} />)}
        </div>
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider px-3 mb-2">Business</p>
          {bizNav.map((item) => <NavItem key={item.href} item={item} />)}
        </div>
      </nav>

      {/* Trial banner */}
      {company?.subscriptionStatus === "trialing" && (
        <div className="mx-3 mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Free Trial Active</p>
          <p className="text-xs text-amber-600">Add Stripe keys to activate billing.</p>
          <Link href="/settings" onClick={onClose}>
            <button className="mt-2 w-full text-xs bg-amber-500 text-white rounded-lg py-1.5 font-semibold hover:bg-amber-600 transition-colors">
              Choose Plan
            </button>
          </Link>
        </div>
      )}

      {/* Bottom links */}
      <div className="border-t border-slate-100 px-3 py-2 space-y-0.5 flex-shrink-0">
        <Link href="/settings" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer">
            <Settings className="w-4 h-4 text-slate-400" />
            Settings
          </div>
        </Link>
        <Link href="/setup" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer">
            <Wrench className="w-4 h-4 text-slate-400" />
            App Setup
          </div>
        </Link>
        <button
          onClick={() => { onClose?.(); signOut(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pool-500 to-[#00c3e3] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{user?.displayName ?? "Pool Pro"}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router  = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-pool-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading PoolPal AI...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-white flex flex-col h-full shadow-2xl">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <p className="text-sm text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
        <OfflineBanner />
      </main>
    </div>
  );
}
