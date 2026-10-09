import { ChevronsLeft, Container } from 'lucide-react'
import { matchPath, NavLink, useLocation } from 'react-router'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { navigation, settingsItem, supportItem, type NavItem } from '@/config/navigation'
import { useSettings } from '@/data/settings'
import { cn } from '@/lib/utils'

type AppSidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { companyName, companyTagline } = useSettings()

  return (
    <aside
      className={cn(
        'flex h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Логотип компании */}
      <div
        className={cn(
          'flex h-14 items-center gap-2.5 border-b border-sidebar-border',
          collapsed ? 'justify-center' : 'px-4',
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Container className="size-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-sidebar-accent-foreground">{companyName}</div>
            <div className="truncate text-xs text-sidebar-foreground/60">{companyTagline}</div>
          </div>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto px-3 py-4', collapsed ? 'space-y-1' : 'space-y-5')}>
        {navigation.map((group, index) => (
          <div key={group.label}>
            {/* В свёрнутом виде вместо подписей групп — тонкий разделитель */}
            {collapsed && index > 0 && <div className="mx-auto mb-1 h-px w-6 bg-sidebar-border" />}
            {!collapsed && (
              <div className="mb-1.5 px-2 text-[11px] font-medium tracking-wider text-sidebar-foreground/50 uppercase">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <SidebarLink item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border px-3 py-3">
        <SidebarLink item={settingsItem} collapsed={collapsed} />
        <SidebarLink item={supportItem} collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex h-9 items-center gap-3 rounded-md text-sm text-sidebar-foreground/70 outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            collapsed ? 'mx-auto w-10 justify-center' : 'w-full px-2.5',
          )}
        >
          <ChevronsLeft className={cn('size-4 shrink-0 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  const { pathname } = useLocation()

  // Активность считаем сами, а не через className-функцию NavLink:
  // Tooltip (Radix Slot) склеивает className как строку и ломает функцию — из-за этого «плыли» иконки
  const isActive = matchPath({ path: item.path, end: item.path === '/' }, pathname) !== null

  const link = (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={cn(
        'flex h-9 items-center gap-3 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        // Свёрнуто: квадратная кнопка 40px строго по центру, развёрнуто: на всю ширину
        collapsed ? 'mx-auto w-10 justify-center' : 'px-2.5',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </NavLink>
  )

  // В свёрнутом виде текста нет, поэтому показываем название в подсказке
  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  )
}
