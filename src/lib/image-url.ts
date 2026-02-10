const INTERNAL_IMAGE_PATH_PREFIXES = ['/api/files/']

export function isInternalImageUrl(src: string | null | undefined): src is string {
  if (typeof src !== 'string') return false

  const normalized = src.trim()
  if (!normalized) return false

  if (INTERNAL_IMAGE_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true
  }

  try {
    const parsed = new URL(normalized)
    return INTERNAL_IMAGE_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix))
  } catch {
    return false
  }
}
