import { createHmac, timingSafeEqual } from 'node:crypto'

const REPLY_SCOPE = 'reply'
const DEFAULT_EXPIRE_DAYS = 365

type ReplyUnsubscribePayload = {
  scope: typeof REPLY_SCOPE
  email: string
  exp: number
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function getSigningSecret(): string {
  const secret = (process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || '').trim()
  if (!secret) {
    throw new Error('缺少 EMAIL_UNSUBSCRIBE_SECRET 或 NEXTAUTH_SECRET，无法生成退订签名')
  }
  return secret
}

function signPayload(payloadBase64Url: string): string {
  const secret = getSigningSecret()
  return createHmac('sha256', secret).update(payloadBase64Url).digest('base64url')
}

function getExpireDays(): number {
  const raw = process.env.EMAIL_REPLY_UNSUBSCRIBE_EXPIRE_DAYS
  const value = raw ? Number(raw) : DEFAULT_EXPIRE_DAYS
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_EXPIRE_DAYS
  return Math.floor(value)
}

export function generateReplyUnsubscribeToken(email: string): string {
  const normalizedEmail = normalizeEmail(email)
  const payload: ReplyUnsubscribePayload = {
    scope: REPLY_SCOPE,
    email: normalizedEmail,
    exp: Math.floor(Date.now() / 1000) + getExpireDays() * 24 * 60 * 60,
  }

  const encoded = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(encoded)
  return `${encoded}.${signature}`
}

export function verifyReplyUnsubscribeToken(email: string, token: string): boolean {
  if (!token || !email) return false
  const normalizedEmail = normalizeEmail(email)
  const [encodedPayload, signature] = token.split('.', 2)
  if (!encodedPayload || !signature) return false

  let expectedSignature: string
  try {
    expectedSignature = signPayload(encodedPayload)
  } catch {
    return false
  }

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const actualBuffer = Buffer.from(signature, 'utf8')
  if (expectedBuffer.length !== actualBuffer.length) return false
  if (!timingSafeEqual(expectedBuffer, actualBuffer)) return false

  let payload: ReplyUnsubscribePayload
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as ReplyUnsubscribePayload
  } catch {
    return false
  }

  if (payload.scope !== REPLY_SCOPE) return false
  if (normalizeEmail(payload.email) !== normalizedEmail) return false
  if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return false
  return true
}
