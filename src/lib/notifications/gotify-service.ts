import { getSetting } from '@/lib/settings'
import { sendGotifyNotification } from './gotify'

type CommentStatus = 'PENDING' | 'APPROVED' | 'SPAM' | 'REJECTED'

type GotifyConfig = {
  enabled: boolean
  notifyNew: boolean
  notifyPending: boolean
  url: string
  token: string
}

export type CommentGotifyNotificationInput = {
  status: CommentStatus
  content: string
  authorName: string | null
  author: {
    name: string | null
    image: string | null
  } | null
  post: {
    title: string
  }
}

export class GotifyServiceError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GotifyServiceError'
    this.status = status
  }
}

async function getGotifyConfig(): Promise<GotifyConfig> {
  const [enabledRaw, notifyNewRaw, notifyPendingRaw, settingUrlRaw, settingTokenRaw] = await Promise.all([
    getSetting<boolean>('notifications.gotify.enabled', false),
    getSetting<boolean>('notifications.gotify.notifyNewComment', true),
    getSetting<boolean>('notifications.gotify.notifyPendingComment', true),
    getSetting<string>('notifications.gotify.url', ''),
    getSetting<string>('notifications.gotify.token', ''),
  ])

  return {
    enabled: enabledRaw ?? false,
    notifyNew: notifyNewRaw ?? true,
    notifyPending: notifyPendingRaw ?? true,
    url: (process.env.GOTIFY_URL || settingUrlRaw || '').trim(),
    token: (process.env.GOTIFY_TOKEN || settingTokenRaw || '').trim(),
  }
}

function getMissingConfigItems(config: Pick<GotifyConfig, 'url' | 'token'>): string[] {
  const missing: string[] = []
  if (!config.url) missing.push('url')
  if (!config.token) missing.push('token')
  return missing
}

export async function sendCommentGotifyNotification(input: CommentGotifyNotificationInput): Promise<void> {
  const config = await getGotifyConfig()
  if (!config.enabled) return

  const shouldNotifyPending = input.status === 'PENDING' && config.notifyPending
  const shouldNotifyNew = input.status === 'APPROVED' && config.notifyNew
  if (!shouldNotifyPending && !shouldNotifyNew) return

  const missing = getMissingConfigItems(config)
  if (missing.length > 0) return

  const authorLabel = input.author?.name || input.authorName || '匿名用户'
  const summary = input.content.length > 120 ? `${input.content.slice(0, 120)}…` : input.content
  const title = shouldNotifyPending ? '新评论待审核' : '新评论'
  const message = [
    `文章：${input.post.title}`,
    `作者：${authorLabel}`,
    `摘要：${summary}`,
  ].join('\n')

  await sendGotifyNotification({
    url: config.url,
    token: config.token,
    title,
    message,
    priority: shouldNotifyPending ? 8 : 5,
  })
}

export type GotifyTestNotificationInput = {
  title?: string
  message?: string
  priority?: number
}

export async function sendGotifyTestNotification(input: GotifyTestNotificationInput): Promise<void> {
  const config = await getGotifyConfig()
  if (!config.enabled) {
    throw new GotifyServiceError('Gotify 推送未启用', 400)
  }

  const missing = getMissingConfigItems(config)
  if (missing.length > 0) {
    throw new GotifyServiceError(`Gotify 配置不完整（缺少 ${missing.join(' / ')}）`, 400)
  }

  const title = input.title?.trim() || '测试推送 - 执笔为剑'
  const message = input.message?.trim() || '这是一条来自 执笔为剑 的 Gotify 测试通知'
  const priority = Number.isFinite(input.priority) ? Number(input.priority) : 5

  await sendGotifyNotification({
    url: config.url,
    token: config.token,
    title,
    message,
    priority,
  })
}
