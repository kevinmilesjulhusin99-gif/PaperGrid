'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminNav } from '@/components/layout/admin-nav'

export function AdminMobileSidebar({
  items,
}: {
  items: { href: string; iconName: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? '关闭侧栏' : '打开侧栏'}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

          <div className="relative z-10 w-64 transform overflow-auto bg-white p-4 dark:bg-gray-800 transition-all duration-200 ease-out">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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
