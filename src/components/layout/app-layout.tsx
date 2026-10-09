import { useState } from 'react'
import { Outlet } from 'react-router'

import { TooltipProvider } from '@/components/ui/tooltip'
import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

// Каркас всех страниц: слева меню, сверху шапка, в центре <Outlet /> — сюда роутер подставляет текущую страницу
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider>
      <div className="flex h-svh overflow-hidden bg-muted/40">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
