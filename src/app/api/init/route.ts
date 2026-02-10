import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const initToken = process.env.INIT_ADMIN_TOKEN
    if (!initToken) {
      return NextResponse.json({ success: false, message: '初始化接口已禁用' }, { status: 403 })
    }

    const provided = request.headers.get('x-init-token')
    if (provided !== initToken) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 })
    }

    const initUsedSetting = await prisma.setting.findUnique({
      where: { key: 'admin.init.used' },
      select: { value: true },
    })
    const initUsed = Boolean((initUsedSetting?.value as any)?.used)
    if (initUsed) {
      return NextResponse.json({ success: false, message: '初始化接口已关闭' }, { status: 403 })
    }

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    })

    if (existingAdmin) {
      await prisma.setting.upsert({
        where: { key: 'admin.init.used' },
        update: { value: { used: true }, group: 'admin', editable: false },
        create: { key: 'admin.init.used', value: { used: true }, group: 'admin', editable: false },
      })
      return NextResponse.json({
        success: true,
        message: '默认管理员账号已存在',
        data: {
          email: 'admin@example.com',
        },
      })
    }

    // Create default admin user
    const initPassword = process.env.ADMIN_INIT_PASSWORD || 'admin123'
    const hashedPassword = await bcrypt.hash(initPassword, 10)

    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin',
        password: hashedPassword,
        role: 'ADMIN',
      },
    })

    await prisma.setting.upsert({
      where: { key: 'admin.init.used' },
      update: { value: { used: true }, group: 'admin', editable: false },
      create: { key: 'admin.init.used', value: { used: true }, group: 'admin', editable: false },
    })

    return NextResponse.json({
      success: true,
      message: '默认管理员账号创建成功!',
      data: {
        email: 'admin@example.com',
        userId: admin.id,
      },
    })
  } catch (error) {
    console.error('创建管理员失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '创建失败',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
