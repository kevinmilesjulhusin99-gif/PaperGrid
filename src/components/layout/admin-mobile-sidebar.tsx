'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminNav } from '@/components/layout/admin-nav'

export function AdminMobileSidebar({
  items,
  logoSrc = '/logo.svg',
}: {
  items: { href: string; iconName: string; label: string }[]
  logoSrc?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="打开侧栏">
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

          <div className="relative z-10 w-64 transform overflow-auto bg-white p-4 dark:bg-gray-800 transition-all duration-200 ease-out">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-primary p-0.5">
                  <img
                    src={logoSrc}
                    alt="博客 logo"
                    className="h-full w-full scale-110 object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <h3 className="text-lg font-semibold">菜单</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="关闭侧栏">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-4">
              <AdminNav items={items} onLinkClick={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
