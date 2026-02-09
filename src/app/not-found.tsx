import { SectionHeadingAccent } from '@/components/layout/section-heading-accent'
import { Button } from '@/components/ui/button'
import { Archive, BookOpen, Home } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <section className="bg-transparent py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
              404
            </h1>
            <SectionHeadingAccent />
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              你要找的页面走丢了
            </p>
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="mx-auto flex min-h-[52vh] max-w-7xl flex-col items-center px-4 text-center sm:min-h-[60vh] sm:px-6 lg:px-8">
          <div className="relative mx-auto mt-10 max-w-4xl sm:mt-14">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-8 -left-8 text-7xl leading-none font-black text-gray-300 sm:-top-12 sm:-left-14 sm:text-8xl lg:-left-20 lg:text-9xl dark:text-gray-700"
            >
              &ldquo;
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute -right-8 -bottom-24 text-7xl leading-none font-black text-gray-300 sm:-right-14 sm:-bottom-28 sm:text-8xl lg:-right-20 lg:text-9xl dark:text-gray-700"
            >
              &rdquo;
            </span>
            <blockquote className="px-8 font-serif text-2xl leading-relaxed text-gray-700 sm:px-14 sm:text-3xl dark:text-gray-300">
              非淡泊无以明志，非宁静无以致远。
            </blockquote>
          </div>

          <div className="mt-auto pb-16 sm:pb-20 lg:pb-24">
            <p className="max-w-2xl text-sm text-gray-600 sm:text-base dark:text-gray-400">
              可能是链接已过期、页面被移动，或只是一个小小的拼写错误。
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/">
                <Button className="gap-2">
                  <Home className="h-4 w-4" />
                  返回首页
                </Button>
              </Link>
              <Link href="/posts">
                <Button variant="outline" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  浏览文章
                </Button>
              </Link>
              <Link href="/archive">
                <Button variant="ghost" className="gap-2">
                  <Archive className="h-4 w-4" />
                  归档
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
