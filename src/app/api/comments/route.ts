import { after, NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import sanitizeHtml from 'sanitize-html'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { getPostUnlockTokenFromHeaders, verifyPostUnlockToken } from '@/lib/post-protection'
import { sendCommentGotifyNotification, type CommentGotifyNotificationInput } from '@/lib/notifications/gotify-service'

function sendCommentGotifyNotificationAsync(comment: CommentGotifyNotificationInput) {
  after(async () => {
    try {
      await sendCommentGotifyNotification(comment)
    } catch (notifyError) {
      console.error('Gotify 通知发送失败:', notifyError)
    }
  })
}

// GET /api/comments?slug=xxx - 获取文章的所有评论
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: '缺少文章 slug' }, { status: 400 })
    }

    const commentsEnabled = (await getSetting<boolean>('comments.enabled', true)) ?? true
    if (!commentsEnabled) {
      return NextResponse.json({ error: '评论功能已关闭' }, { status: 403 })
    }

    // 查找文章
    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true, isProtected: true, passwordHash: true },
    })

    if (!post) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    if (post.isProtected) {
      if (!post.passwordHash) {
        return NextResponse.json({ error: '文章已加密' }, { status: 403 })
      }
      const token = getPostUnlockTokenFromHeaders(request.headers)
      const unlocked = token
        ? verifyPostUnlockToken(token, post.id, post.passwordHash)
        : false
      if (!unlocked) {
        return NextResponse.json({ error: '文章已加密' }, { status: 403 })
      }
    }

    // 获取评论（已审核通过的评论）
    const comments = await prisma.comment.findMany({
      where: {
        postId: post.id,
        status: 'APPROVED',
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorName: true,
        parentId: true,
        author: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('获取评论失败:', error)
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
  }
}

// POST /api/comments?slug=xxx - 创建新评论
export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(`comments:${getClientIp(request)}`, {
      windowMs: 5 * 60 * 1000,
      max: 30,
    })
    if (!limit.ok) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429, headers: rateLimitHeaders(limit) }
      )
    }

    const session = await auth()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: '缺少文章 slug' }, { status: 400 })
    }

    // 查找文章
    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true, status: true, isProtected: true, passwordHash: true },
    })

    if (!post) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    if (post.status !== 'PUBLISHED') {
      return NextResponse.json({ error: '文章未发布' }, { status: 400 })
    }

    const commentsEnabled = (await getSetting<boolean>('comments.enabled', true)) ?? true
    if (!commentsEnabled) {
      return NextResponse.json({ error: '评论功能已关闭' }, { status: 403 })
    }

    if (post.isProtected) {
      if (!post.passwordHash) {
        return NextResponse.json({ error: '文章已加密' }, { status: 403 })
      }
      const token = getPostUnlockTokenFromHeaders(request.headers)
      const unlocked = token
        ? verifyPostUnlockToken(token, post.id, post.passwordHash)
        : false
      if (!unlocked) {
        return NextResponse.json({ error: '文章已加密' }, { status: 403 })
      }
    }

    const [allowGuestRaw, moderationRequiredRaw, guestModerationRequiredRaw] = await Promise.all([
      getSetting<boolean>('comments.allowGuest', false),
      getSetting<boolean>('comments.moderationRequired', false),
      getSetting<boolean>('comments.guestModerationRequired', false),
    ])
    const allowGuest = allowGuestRaw ?? false
    const moderationRequired = moderationRequiredRaw ?? false
    const guestModerationRequired = guestModerationRequiredRaw ?? false

    const body = await request.json()
    const { content, authorName, authorEmail, parentId } = body

    // 检查用户是否登录
    if (!session?.user && !allowGuest) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    // 验证评论内容
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })
    }

    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim()

    if (sanitizedContent.length === 0) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })
    }

    if (sanitizedContent.length > 1000) {
      return NextResponse.json({ error: '评论内容不能超过1000字' }, { status: 400 })
    }

    let guestName: string | null = null
    let guestEmail: string | null = null
    if (!session?.user) {
      guestName = typeof authorName === 'string' ? authorName.trim() : ''
      guestEmail = typeof authorEmail === 'string' ? authorEmail.trim() : ''
      if (!guestName || !guestEmail) {
        return NextResponse.json({ error: '请填写昵称和联系邮箱' }, { status: 400 })
      }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)
      if (!emailOk) {
        return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
      }
      if (guestName.length > 50 || guestEmail.length > 100) {
        return NextResponse.json({ error: '昵称或邮箱过长' }, { status: 400 })
      }
    }

    let parentCommentId: string | null = null
    if (parentId) {
      if (typeof parentId !== 'string') {
        return NextResponse.json({ error: '回复目标不合法' }, { status: 400 })
      }
      const parentComment = await prisma.comment.findFirst({
        where: {
          id: parentId,
          postId: post.id,
          status: 'APPROVED',
        },
        select: { id: true },
      })
      if (!parentComment) {
        return NextResponse.json({ error: '回复目标不存在或未通过审核' }, { status: 400 })
      }
      parentCommentId = parentComment.id
    }

    // 创建评论
    const shouldModerateGuest = moderationRequired ? true : guestModerationRequired
    const status = session?.user
      ? (moderationRequired ? 'PENDING' : 'APPROVED')
      : (shouldModerateGuest ? 'PENDING' : 'APPROVED')

    const comment = await prisma.comment.create({
      data: {
        content: sanitizedContent,
        postId: post.id,
        authorId: session?.user ? session.user.id : null,
        authorName: guestName,
        authorEmail: guestEmail,
        parentId: parentCommentId,
        status,
      },
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        authorName: true,
        author: {
          select: {
            name: true,
            image: true,
          },
        },
        post: {
          select: {
            title: true,
          },
        },
      },
    })
    sendCommentGotifyNotificationAsync(comment)

    const responseComment = {
      id: comment.id,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt,
      authorName: comment.authorName,
      author: comment.author,
    }

    return NextResponse.json({ comment: responseComment }, { status: 201 })
  } catch (error) {
    console.error('创建评论失败:', error)
    return NextResponse.json({ error: '创建评论失败' }, { status: 500 })
  }
}
