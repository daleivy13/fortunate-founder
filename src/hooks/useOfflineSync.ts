"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { drainQueue, count } from "@/lib/offlineQueue";
import { useQueryClient } from "@tanstack/react-query";

export function useOfflineSync() {
  const [isOnline,      setIsOnline]      = useState(true);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [syncing,       setSyncing]       = useState(false);
  const [lastSynced,    setLastSynced]    = useState<number | null>(null);
  const qc = useQueryClient();
  const drainingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (typeof window === "undefined") return;
    const n = await count();
    setPendingCount(n);
  }, []);

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setSyncing(true);
    try {
      const sent = await drainQueue();
      if (sent > 0) {
        // Invalidate all queries so fresh data loads
        qc.invalidateQueries();
        setLastSynced(Date.now());
      }
      await refreshCount();
    } finally {
      setSyncing(false);
      drainingRef.current = false;
    }
  }, [qc, refreshCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshCount();

    const handleOnline  = () => { setIsOnline(true);  drain(); };
    const handleOffline = () => { setIsOnline(false); refreshCount(); };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [drain, refreshCount]);

  return { isOnline, pendingCount, syncing, lastSynced, refreshCount };
}
