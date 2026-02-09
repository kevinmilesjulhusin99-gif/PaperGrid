import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/stats - 获取统计数据
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 并行获取所有统计数据
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalComments,
      pendingComments,
      totalCategories,
      totalTags,
      totalViews,
      recentPosts,
      popularPosts,
      recentComments,
    ] = await Promise.all([
      // 文章统计
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'DRAFT' } }),

      // 评论统计
      prisma.comment.count(),
      prisma.comment.count({ where: { status: 'PENDING' } }),

      // 分类和标签统计
      prisma.category.count(),
      prisma.tag.count(),

      // 阅读统计
      prisma.viewCount.aggregate({
        _sum: { count: true },
      }),

      // 最近文章（最近7天）
      prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          viewCount: { select: { count: true } },
        },
      }),

      // 热门文章（按阅读量）
      prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { viewCount: { count: 'desc' } },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          viewCount: { select: { count: true } },
        },
      }),

      // 最近评论
      prisma.comment.findMany({
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          author: {
            select: { name: true },
          },
          post: {
            select: { title: true },
          },
        },
      }),
    ])

    // 计算本周新增文章
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const postsThisWeek = await prisma.post.count({
      where: {
        createdAt: { gte: weekAgo },
      },
    })

    // 获取最近30天的阅读量趋势（UTC日粒度）
    const startOfUtcDay = (date: Date) =>
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const dateKey = (date: Date) => date.toISOString().split('T')[0]

    const todayUtc = startOfUtcDay(new Date())
    const thirtyDaysStartUtc = new Date(todayUtc)
    thirtyDaysStartUtc.setUTCDate(thirtyDaysStartUtc.getUTCDate() - 29)

    const dailyTrend = await prisma.dailyView.groupBy({
      by: ['date'],
      where: {
        date: {
          gte: thirtyDaysStartUtc,
          lte: todayUtc,
        },
      },
      _sum: {
        views: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    const viewTrendByDate = dailyTrend.reduce((acc, item) => {
      const key = dateKey(item.date)
      acc[key] = item._sum.views || 0
      return acc
    }, {} as Record<string, number>)

    const dates: string[] = []
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(thirtyDaysStartUtc)
      d.setUTCDate(thirtyDaysStartUtc.getUTCDate() + i)
      dates.push(dateKey(d))
    }

    const chartData = dates.map((date) => ({
      date,
      views: viewTrendByDate[date] || 0,
    }))

    const stats = {
      // 文章统计
      posts: {
        total: totalPosts,
        published: publishedPosts,
        draft: draftPosts,
        thisWeek: postsThisWeek,
      },
      // 评论统计
      comments: {
        total: totalComments,
        pending: pendingComments,
      },
      // 分类和标签
      categories: totalCategories,
      tags: totalTags,
      // 阅读统计
      views: {
        total: totalViews._sum.count || 0,
        trend: chartData,
      },
      // 最近文章
      recentPosts,
      // 热门文章
      popularPosts,
      // 最近评论
      recentComments,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 })
  }
}
