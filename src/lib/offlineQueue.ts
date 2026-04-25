import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "poolpal-offline";
const STORE   = "pending-mutations";

export interface PendingMutation {
  id?: number;
  url: string;
  method: string;
  body: string;         // JSON-stringified
  createdAt: number;
  label: string;        // human-readable, shown in banner
}

let _db: IDBPDatabase | null = null;

async function getDB() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    },
  });
  return _db;
}

export async function enqueue(mutation: Omit<PendingMutation, "id" | "createdAt">) {
  const db = await getDB();
  await db.add(STORE, { ...mutation, createdAt: Date.now() });
}

export async function getAll(): Promise<PendingMutation[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function remove(id: number) {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function count(): Promise<number> {
  const db = await getDB();
  return db.count(STORE);
}

/** Replay all queued mutations in order. Returns number successfully sent. */
export async function drainQueue(): Promise<number> {
  const db  = await getDB();
  const all = await db.getAll(STORE) as PendingMutation[];
  let sent  = 0;
  for (const m of all) {
    try {
      const res = await fetch(m.url, {
        method: m.method,
        headers: { "Content-Type": "application/json" },
        body: m.body,
        credentials: "include",
      });
      if (res.ok) {
        await db.delete(STORE, m.id!);
        sent++;
      }
    } catch {
      // still offline or server error — leave in queue
      break;
    }
  }
  return sent;
}
