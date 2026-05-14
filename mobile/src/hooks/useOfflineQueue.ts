import { useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";

const QUEUE_KEY = "poolpal_offline_queue";

export interface QueuedRequest {
  id:        string;
  method:    "POST" | "PATCH";
  path:      string;
  body:      Record<string, any>;
  queuedAt:  string;
  retries:   number;
}

async function loadQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedRequest[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(method: "POST" | "PATCH", path: string, body: Record<string, any>) {
  const queue = await loadQueue();
  queue.push({
    id:       `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method,
    path,
    body,
    queuedAt: new Date().toISOString(),
    retries:  0,
  });
  await saveQueue(queue);
}

export async function flushQueue(): Promise<{ flushed: number; failed: number }> {
  const queue = await loadQueue();
  if (!queue.length) return { flushed: 0, failed: 0 };

  const remaining: QueuedRequest[] = [];
  let flushed = 0;
  let failed  = 0;

  for (const item of queue) {
    try {
      if (item.method === "POST") {
        await api.post(item.path, item.body);
      } else {
        await api.patch(item.path, item.body);
      }
      flushed++;
    } catch {
      item.retries++;
      if (item.retries < 5) {
        remaining.push(item);
      } else {
        failed++;
      }
    }
  }

  await saveQueue(remaining);
  return { flushed, failed };
}

export async function getQueueLength(): Promise<number> {
  const q = await loadQueue();
  return q.length;
}

export function useOfflineQueue() {
  const flush = useCallback(async () => {
    return flushQueue();
  }, []);

  const add = useCallback(async (method: "POST" | "PATCH", path: string, body: Record<string, any>) => {
    return enqueue(method, path, body);
  }, []);

  return { flush, add };
}
