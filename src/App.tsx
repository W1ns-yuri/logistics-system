import { RouterProvider } from 'react-router'

import { useTheme } from '@/hooks/use-theme'
import { router } from '@/router'

export default function App() {
  // Тему применяем на уровне всего приложения, чтобы она работала и на странице входа
  useTheme()
  return <RouterProvider router={router} />
}
