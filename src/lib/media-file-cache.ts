type MediaResolvedFile = {
  storagePath: string
  mimeType: string
  size: number
  sha256: string | null
  createdAt: Date
  absolutePath: string
}

type CacheEntry = {
  value: MediaResolvedFile
  expiresAt: number
}

type MediaResolveCacheStore = Map<string, CacheEntry>

const globalStore = globalThis as typeof globalThis & {
  __mediaResolveCache?: MediaResolveCacheStore
}

const store: MediaResolveCacheStore = globalStore.__mediaResolveCache ?? new Map()
if (!globalStore.__mediaResolveCache) {
  globalStore.__mediaResolveCache = store
}

export const MEDIA_RESOLVE_CACHE_TTL_MS = Math.max(
  1000,
  Number.parseInt(process.env.MEDIA_RESOLVE_CACHE_TTL_MS || '30000', 10) || 30_000
)

function cleanup(now: number) {
  if (store.size < 2000) return
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(id)
    }
  }
}

export function getCachedMediaResolvedFile(id: string): MediaResolvedFile | null {
  const now = Date.now()
  const entry = store.get(id)
  if (!entry) return null

  if (entry.expiresAt <= now) {
    store.delete(id)
    return null
  }

  return entry.value
}

export function setCachedMediaResolvedFile(id: string, value: MediaResolvedFile) {
  const now = Date.now()
  store.set(id, {
    value,
    expiresAt: now + MEDIA_RESOLVE_CACHE_TTL_MS,
  })
  cleanup(now)
}

export function removeCachedMediaResolvedFile(id: string) {
  store.delete(id)
}

export type { MediaResolvedFile }
