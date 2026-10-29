import { useState } from 'react'
import { Outlet } from 'react-router'

import { LicenseBanner } from '@/components/license'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

// Свёрнуто ли меню — помним в браузере, иначе при смене языка (страница перерисовывается заново) меню раскрывается само
const COLLAPSED_KEY = 'sidebar-collapsed'
function loadCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

// Каркас всех страниц: слева меню, сверху шапка, в центре <Outlet /> — сюда роутер подставляет текущую страницу
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const toggle = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, prev ? '0' : '1')
      } catch {
        // не сохранилось — не страшно
      }
      return !prev
    })
  }

  return (
    <TooltipProvider>
      <div className="flex h-svh overflow-hidden bg-muted/40">
        <AppSidebar collapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <LicenseBanner />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
