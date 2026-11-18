import { RouterProvider } from 'react-router'

import { useCatalogReady } from '@/data/catalog'
import { useSettings } from '@/data/settings'
import { useTheme } from '@/hooks/use-theme'
import { useCityNamesReady } from '@/lib/countries'
import { router } from '@/router'

export default function App() {
  // Тему применяем на уровне всего приложения, чтобы она работала и на странице входа
  useTheme()
  const { language } = useSettings()
  // На русском сначала подгружаем русские названия городов (≈100 КБ), чтобы маршруты в списках были на одном языке
  const citiesReady = useCityNamesReady(language === 'ru')
  const catalogReady = useCatalogReady()
  if (!citiesReady || !catalogReady) return null
  // key: при смене языка роутер перемонтируется и все страницы перерисуются на новом языке
  return <RouterProvider key={language} router={router} />
}
