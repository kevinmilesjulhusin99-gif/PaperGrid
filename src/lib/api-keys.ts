import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

const API_KEY_PREFIX = 'eak_'
const API_KEY_ATTEMPT_WINDOW_MS = 60 * 1000
const API_KEY_ATTEMPT_MAX = 180
const API_KEY_INVALID_WINDOW_MS = 5 * 60 * 1000
const API_KEY_INVALID_MAX = 60
const API_KEY_USAGE_WINDOW_MS = 60 * 1000
const API_KEY_USAGE_MAX = 120

export type ApiKeyPermission =
  | 'POST_CREATE'
  | 'POST_UPDATE'
  | 'POST_DELETE'
  | 'POST_READ'

export const API_KEY_PERMISSION_LIST: ApiKeyPermission[] = [
  'POST_CREATE',
  'POST_UPDATE',
  'POST_DELETE',
  'POST_READ',
]

export function generateApiKey(): string {
  const raw = crypto.randomBytes(32).toString('base64url')
  return `${API_KEY_PREFIX}${raw}`
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

export function extractApiKey(request: Request): string | null {
  const headerKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key')
  if (headerKey) {
    const normalized = headerKey.trim()
    return normalized.length > 0 ? normalized : null
  }

  const auth = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!auth) return null
  const matched = auth.match(/^Bearer\s+(.+)$/i)
  if (matched?.[1]) {
    const token = matched[1].trim()
    return token.length > 0 ? token : null
  }
  return null
}

function normalizeStoredPermissions(input: unknown): ApiKeyPermission[] {
  const allowed = new Set(API_KEY_PERMISSION_LIST)
  if (!Array.isArray(input)) return []
  const dedup = new Set<ApiKeyPermission>()
  for (const permission of input) {
    if (typeof permission === 'string' && allowed.has(permission as ApiKeyPermission)) {
      dedup.add(permission as ApiKeyPermission)
    }
  }
  return [...dedup]
}

export function hasApiKeyPermissions(
  permissions: ApiKeyPermission[],
  required: ApiKeyPermission | ApiKeyPermission[]
) {
  const requiredList = Array.isArray(required) ? required : [required]
  return requiredList.every((perm) => permissions.includes(perm))
}

export async function requireApiKey(
  request: Request,
  required?: ApiKeyPermission | ApiKeyPermission[]
) {
  const clientIp = getClientIp(request)

  const attemptLimit = rateLimit(`api-key:attempt:${clientIp}`, {
    windowMs: API_KEY_ATTEMPT_WINDOW_MS,
    max: API_KEY_ATTEMPT_MAX,
  })
  if (!attemptLimit.ok) {
    return {
      ok: false,
      status: 429,
      error: '请求过于频繁，请稍后再试',
      headers: rateLimitHeaders(attemptLimit),
    }
  }

  const rawKey = extractApiKey(request)
  if (!rawKey) {
    return {
      ok: false,
      status: 401,
      error: '缺少 API Key',
      headers: rateLimitHeaders(attemptLimit),
    }
  }

  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    const invalidLimit = rateLimit(`api-key:invalid:${clientIp}`, {
      windowMs: API_KEY_INVALID_WINDOW_MS,
      max: API_KEY_INVALID_MAX,
    })

    return {
      ok: false,
      status: invalidLimit.ok ? 401 : 429,
      error: invalidLimit.ok ? '无效 API Key' : '无效请求过多，请稍后再试',
      headers: rateLimitHeaders(invalidLimit),
    }
  }

  const keyHash = hashApiKey(rawKey)
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } })

  if (!apiKey) {
    const invalidLimit = rateLimit(`api-key:invalid:${clientIp}`, {
      windowMs: API_KEY_INVALID_WINDOW_MS,
      max: API_KEY_INVALID_MAX,
    })

    return {
      ok: false,
      status: invalidLimit.ok ? 401 : 429,
      error: invalidLimit.ok ? '无效 API Key' : '无效请求过多，请稍后再试',
      headers: rateLimitHeaders(invalidLimit),
    }
  }

  if (!apiKey.enabled) {
    return {
      ok: false,
      status: 401,
      error: 'API Key 已禁用',
      headers: rateLimitHeaders(attemptLimit),
    }
  }

  if (apiKey.expiresAt && apiKey.expiresAt <= new Date()) {
    return {
      ok: false,
      status: 401,
      error: 'API Key 已过期',
      headers: rateLimitHeaders(attemptLimit),
    }
  }

  const usageLimit = rateLimit(`api-key:usage:${apiKey.id}:${clientIp}`, {
    windowMs: API_KEY_USAGE_WINDOW_MS,
    max: API_KEY_USAGE_MAX,
  })
  if (!usageLimit.ok) {
    return {
      ok: false,
      status: 429,
      error: '请求过于频繁，请稍后再试',
      headers: rateLimitHeaders(usageLimit),
    }
  }

  const storedPermissions = normalizeStoredPermissions(apiKey.permissions)

  if (required && !hasApiKeyPermissions(storedPermissions, required)) {
    return {
      ok: false,
      status: 403,
      error: '权限不足',
      headers: rateLimitHeaders(usageLimit),
    }
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date(), lastUsedIp: clientIp },
  })

  return {
    ok: true,
    apiKey: { ...apiKey, permissions: storedPermissions },
    headers: rateLimitHeaders(usageLimit),
  }
}

export function getPermissionLabels() {
  return {
    POST_READ: '查询文章',
    POST_CREATE: '增加文章',
    POST_UPDATE: '修改文章',
    POST_DELETE: '删除文章',
  } as Record<ApiKeyPermission, string>
}
