import { isIP } from 'node:net'

type Bucket = {
  tokens: number
  lastRefill: number
  lastSeen: number
}

export type RateLimitOptions = {
  windowMs: number
  max: number
}

export type RateLimitResult = {
  ok: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter: number
}

type RateLimitStore = Map<string, Bucket>

const globalStore = globalThis as typeof globalThis & {
  __rateLimitBuckets?: RateLimitStore
}

const store: RateLimitStore = globalStore.__rateLimitBuckets ?? new Map()
if (!globalStore.__rateLimitBuckets) {
  globalStore.__rateLimitBuckets = store
}

function cleanupStore(now: number, windowMs: number) {
  if (store.size < 10000) return
  const cutoff = now - windowMs * 2
  for (const [key, bucket] of store) {
    if (bucket.lastSeen < cutoff) {
      store.delete(key)
    }
  }
}

function normalizeIp(raw: string | null): string | null {
  if (!raw) return null

  const [first] = raw.split(',')
  const candidate = first?.trim()
  if (!candidate) return null

  const bracket = candidate.match(/^\[([^\]]+)\](?::\d+)?$/)
  const unwrapped = bracket ? bracket[1] : candidate
  const ipv4Mapped = unwrapped.startsWith('::ffff:') ? unwrapped.slice(7) : unwrapped

  return isIP(ipv4Mapped) === 0 ? null : ipv4Mapped
}

export function getClientIp(request: Request): string {
  const realIp = normalizeIp(request.headers.get('x-real-ip'))
  if (realIp) return realIp

  const cfIp = normalizeIp(request.headers.get('cf-connecting-ip'))
  if (cfIp) return cfIp

  const vercelIp = normalizeIp(request.headers.get('x-vercel-forwarded-for'))
  if (vercelIp) return vercelIp

  return 'unknown'
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const { windowMs, max } = options
  const refillRate = max / windowMs

  const bucket = store.get(key) ?? {
    tokens: max,
    lastRefill: now,
    lastSeen: now,
  }

  const elapsed = now - bucket.lastRefill
  if (elapsed > 0) {
    const refill = elapsed * refillRate
    bucket.tokens = Math.min(max, bucket.tokens + refill)
    bucket.lastRefill = now
  }

  bucket.lastSeen = now

  let ok = true
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
  } else {
    ok = false
  }

  store.set(key, bucket)
  cleanupStore(now, windowMs)

  const remaining = Math.max(0, Math.floor(bucket.tokens))
  const resetMs = (max - bucket.tokens) / refillRate
  const reset = Math.ceil((now + resetMs) / 1000)
  const retryAfterMs = Math.max(0, (1 - bucket.tokens) / refillRate)
  const retryAfter = ok ? 0 : Math.ceil(retryAfterMs / 1000)

  return {
    ok,
    limit: max,
    remaining,
    reset,
    retryAfter,
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  }
  if (result.retryAfter > 0) {
    headers['Retry-After'] = String(result.retryAfter)
  }
  return headers
}
