import { RouterProvider } from 'react-router'

import { useSettings } from '@/data/settings'
import { useTheme } from '@/hooks/use-theme'
import { router } from '@/router'

export default function App() {
  // Тему применяем на уровне всего приложения, чтобы она работала и на странице входа
  useTheme()
  const { language } = useSettings()
  // key: при смене языка роутер перемонтируется и все страницы перерисуются на новом языке
  return <RouterProvider key={language} router={router} />
}
