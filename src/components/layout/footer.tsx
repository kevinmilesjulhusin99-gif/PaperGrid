'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Github, Twitter, Mail } from 'lucide-react'

export function Footer({ settings }: { settings?: Record<string, unknown> }) {
  const pathname = usePathname()
  const s: Record<string, unknown> = settings || {}
  const getStr = (key: string, fallback = '') =>
    typeof s[key] === 'string' ? (s[key] as string) : fallback
  const icp = getStr('site.footer_icp')
  const copyright = getStr('site.footer_copyright')
  const poweredBy = getStr('site.footer_powered_by')
  const ownerName = getStr('site.ownerName', '千叶')
  const description = getStr('site.description', '分享技术文章、生活记录和作品展示的个人博客。')
  const currentYear = getStr('site.currentYear', String(new Date().getUTCFullYear()))

  if (pathname?.startsWith('/admin')) return null

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* 关于 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">关于</h3>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">快速链接</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  首页
                </Link>
              </li>
              <li>
                <Link
                  href="/posts"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  文章
                </Link>
              </li>
              <li>
                <Link
                  href="/archive"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  归档
                </Link>
              </li>
              <li>
                <Link
                  href="/yaji"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  雅集
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  分类
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  关于
                </Link>
              </li>
            </ul>
          </div>

          {/* 分类 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">分类</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/categories/tech"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  技术分享
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/life"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  生活记录
                </Link>
              </li>
              <li>
                <Link
                  href="/yaji"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  雅集
                </Link>
              </li>
            </ul>
          </div>

          {/* 社交媒体 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">联系我</h3>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="mailto:contact@example.com"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-800">
          <div className="space-y-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {icp && (
              <p>
                <a
                  href="https://beian.miit.gov.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gray-900 dark:hover:text-white"
                >
                  {icp}
                </a>
              </p>
            )}
            <p>{copyright || `© ${currentYear} ${ownerName}. 保留所有权利.`}</p>
            {poweredBy && <p className="opacity-80">{poweredBy}</p>}
          </div>
        </div>
      </div>
    </footer>
  )
}
