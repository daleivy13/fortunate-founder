"use client";

import { WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function OfflineBanner() {
  const { isOnline, pendingCount, syncing, lastSynced } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
        <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>Offline — changes will sync when reconnected</span>
        {pendingCount > 0 && (
          <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 ml-1">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // Online but still syncing queued mutations
  if (syncing) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-pool-600 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
        <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
        <span>Syncing {pendingCount} offline {pendingCount === 1 ? "change" : "changes"}…</span>
      </div>
    );
  }

  if (lastSynced && pendingCount === 0) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-full shadow-lg animate-fade-in">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span>All changes synced</span>
      </div>
    );
  }

  return null;
}
