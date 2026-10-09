import {
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  title: string
  path: string
  icon: LucideIcon
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

// Единый источник правды для меню: сайдбар, хлебные крошки и роуты берут разделы отсюда.
export const navigation: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ title: 'Home', path: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Quotations', path: '/quotations', icon: FileText },
      { title: 'Shipments', path: '/shipments', icon: Truck },
    ],
  },
  {
    label: 'Directory',
    items: [
      { title: 'Customers', path: '/customers', icon: Users },
      { title: 'Vendors', path: '/vendors', icon: Warehouse },
    ],
  },
  {
    label: 'Finance',
    items: [{ title: 'Payments', path: '/payments', icon: CreditCard }],
  },
]

export const supportItem: NavItem = { title: 'Support', path: '/support', icon: LifeBuoy }

const allItems = [...navigation.flatMap((group) => group.items), supportItem]

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === '/') return allItems[0]
  return allItems.find((item) => item.path !== '/' && pathname.startsWith(item.path))
}
