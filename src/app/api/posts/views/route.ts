import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// POST /api/posts/views  { slug }
// 轻量计数：用于博客阅读量统计，避免阻塞文章页面渲染与缓存。
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const limit = rateLimit(`view:${clientIp}`, {
      windowMs: 5 * 60 * 1000,
      max: 30,
    })

    if (!limit.ok) {
      return NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429, headers: rateLimitHeaders(limit) }
      )
    }

    const body = await request.json().catch(() => null)
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''

    if (!slug || slug.length > 200) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400, headers: rateLimitHeaders(limit) }
      )
    }

    const post = await prisma.post.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
      },
      select: { id: true },
    })

    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404, headers: rateLimitHeaders(limit) }
      )
    }

    const now = new Date()
    const dayStartUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )

    const [, viewCount] = await prisma.$transaction([
      prisma.dailyView.upsert({
        where: {
          date_postId: {
            date: dayStartUtc,
            postId: post.id,
          },
        },
        create: {
          postId: post.id,
          date: dayStartUtc,
          views: 1,
        },
        update: {
          views: { increment: 1 },
        },
      }),
      prisma.viewCount.upsert({
        where: { postId: post.id },
        create: { postId: post.id, count: 1 },
        update: { count: { increment: 1 } },
        select: { count: true },
      }),
    ])

    return NextResponse.json(
      { count: viewCount.count },
      { headers: rateLimitHeaders(limit) }
    )
  } catch (error) {
    console.error('更新阅读量失败:', error)
    return NextResponse.json({ error: '更新阅读量失败' }, { status: 500 })
  }
}
