// Upstash Redis cache — install: npm install @upstash/redis
// Get free Redis at: https://console.upstash.com

let redis: any = null;

async function getRedis() {
  if (redis) return redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // graceful degradation — no cache
  const { Redis } = await import("@upstash/redis");
  redis = new Redis({ url, token });
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = await getRedis();
    if (!r) return null;
    return await r.get(key) as T | null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try {
    const r = await getRedis();
    if (!r) return;
    await r.set(key, value, { ex: ttlSeconds });
  } catch {}
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    const r = await getRedis();
    if (!r) return;
    await r.del(...keys);
  } catch {}
}

export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

// Cache key builders
export const CacheKeys = {
  pools:      (companyId: number) => `pools:${companyId}`,
  pool:       (id: number)        => `pool:${id}`,
  reports:    (companyId: number) => `reports:${companyId}`,
  invoices:   (companyId: number) => `invoices:${companyId}`,
  analytics:  (companyId: number) => `analytics:${companyId}`,
  weather:    (lat: number, lng: number) => `weather:${lat.toFixed(2)}:${lng.toFixed(2)}`,
  tasks:      (poolId: number)    => `tasks:${poolId}`,
};
