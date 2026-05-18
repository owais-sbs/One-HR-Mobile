import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEnvelope<T> = {
  data: T;
  timestamp: number;
};

const memoryCache = new Map<string, CacheEnvelope<unknown>>();

export async function readCache<T>(key: string, ttlMs?: number): Promise<T | null> {
  const now = Date.now();
  const inMemory = memoryCache.get(key) as CacheEnvelope<T> | undefined;
  if (inMemory && (!ttlMs || now - inMemory.timestamp < ttlMs)) {
    return inMemory.data;
  }

  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.timestamp !== 'number') {
      return null;
    }
    if (ttlMs && now - parsed.timestamp >= ttlMs) {
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<T> {
  const envelope: CacheEnvelope<T> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache.set(key, envelope);
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
  return data;
}

export async function removeCache(key: string): Promise<void> {
  memoryCache.delete(key);
  await AsyncStorage.removeItem(key);
}

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; forceRefresh?: boolean } = {},
): Promise<T> {
  const { ttlMs, forceRefresh = false } = options;
  if (!forceRefresh) {
    const cached = await readCache<T>(key, ttlMs);
    if (cached != null) {
      return cached;
    }
  }

  const fresh = await fetcher();
  return writeCache(key, fresh);
}
