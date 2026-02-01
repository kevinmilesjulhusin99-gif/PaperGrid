'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SearchTrigger } from '@/components/search/search-trigger'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogIn } from 'lucide-react'

import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export function Navbar({ settings }: { settings?: Record<string, unknown> }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [postTitle, setPostTitle] = useState('')
  const [showProgressUI, setShowProgressUI] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const titleClearRef = useRef<NodeJS.Timeout | null>(null)
  const s: Record<string, unknown> = settings || {}
  const hideAdminEntry = Boolean(s['ui.hideAdminEntry'])
  const logoUrl = typeof s['site.logoUrl'] === 'string' ? s['site.logoUrl'] : ''
  const siteTitle = typeof s['site.title'] === 'string' ? s['site.title'] : '执笔为剑'
  const defaultAvatarUrl = typeof s['site.defaultAvatarUrl'] === 'string' ? s['site.defaultAvatarUrl'] : ''
  const isPostDetail = Boolean(pathname?.includes('/posts/') && pathname !== '/posts')

  useEffect(() => {
    if (!isPostDetail) {
      setShowProgressUI(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (titleClearRef.current) {
        clearTimeout(titleClearRef.current)
      }
      titleClearRef.current = setTimeout(() => {
        setPostTitle('')
        titleClearRef.current = null
      }, 500)
    } else if (titleClearRef.current) {
      clearTimeout(titleClearRef.current)
      titleClearRef.current = null
    }
  }, [isPostDetail])

  useEffect(() => {
    const handleTitleChange = (e: any) => {
      const nextTitle = e?.detail ?? ''
      if (!nextTitle && !isPostDetail) return
      setPostTitle(nextTitle)
    }
    window.addEventListener('post-title-changed', handleTitleChange as EventListener)

    const handleScroll = () => {
      // Only show title UI on post detail pages and when there is a title
      if (isPostDetail) {
        setShowProgressUI(true)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          setShowProgressUI(false)
        }, 3000)
      } else {
        setShowProgressUI(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('post-title-changed', handleTitleChange as EventListener)
      window.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (titleClearRef.current) clearTimeout(titleClearRef.current)
    }
  }, [isPostDetail])

  // 在管理后台下不展示前台导航栏
  if (pathname?.startsWith('/admin')) return null

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/80">
      <div className="relative flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className={`transition-all duration-300 ${showProgressUI ? 'opacity-0 scale-95 -translate-x-4 pointer-events-none' : 'opacity-100 scale-100 translate-x-0'}`}>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="logo"
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <span className="text-sm font-bold text-primary-foreground">博</span>
              )}
            </div>
            <span className="hidden font-bold text-lg sm:inline-block">
              {siteTitle}
            </span>
          </Link>
        </div>

        {/* 导航菜单 (中心部分) */}
        <div className="flex-1 flex items-center justify-center px-4 h-full overflow-hidden">
          <div className={`hidden items-center gap-6 md:flex transition-all duration-300 ${showProgressUI ? 'opacity-0 -translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
            {[
              { href: '/', label: '首页' },
              { href: '/posts', label: '文章' },
              { href: '/categories', label: '分类' },
              { href: '/tags', label: '标签' },
              { href: '/yaji', label: '雅集' },
              { href: '/about', label: '关于' },
            ].map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-sm font-medium px-2 py-1 transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {item.label}
                  <span
                    className={`absolute left-1/2 bottom-0 h-0.5 bg-gray-900 dark:bg-white rounded transition-all transform ${active ? 'w-6 -translate-x-1/2 opacity-100' : 'w-0 opacity-0'}`}
                  />
                </Link>
              )
            })}
          </div>
        </div>

        {/* 2. 文章标题 (绝对定位居中，确保处于屏幕水平中心) */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none px-12 transition-all duration-500 ${showProgressUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-sm md:text-base font-bold truncate max-w-2xl text-gray-900 dark:text-white text-center">
            {postTitle}
          </span>
        </div>

        {/* 右侧操作区 */}
        <div className={`flex items-center gap-2 transition-all duration-300 ${showProgressUI ? 'opacity-0 scale-95 translate-x-4 pointer-events-none' : 'opacity-100 scale-100 translate-x-0'}`}>
          {/* 搜索 */}
          <SearchTrigger />

          {/* 主题切换 */}
          <div className="flex items-center justify-center p-0">
            <ThemeToggle />
          </div>

          {/* 用户菜单 */}
          {!hideAdminEntry && (
            <div className="flex items-center min-w-[40px] justify-end">
              {session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={session.user.image || defaultAvatarUrl || undefined}
                          alt={session.user.name || 'User'}
                        />
                        <AvatarFallback className="border border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-serif">
                          {session.user.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session.user.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {session?.user?.role === 'ADMIN' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin">管理后台</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={async () => {
                        // 使用 NextAuth 的 signOut
                        const { signOut } = await import('next-auth/react')
                        await signOut({ callbackUrl: '/' })
                      }}
                    >
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : session === undefined ? (
                <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ) : (
                <Link href="/auth/signin">
                  <Button size="sm" variant="ghost">
                    <LogIn className="mr-2 h-4 w-4" />
                    登录
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
