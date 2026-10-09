import { useEffect, useSyncExternalStore } from 'react'

import { updateSettings, useSettings } from '@/data/settings'

const media = window.matchMedia('(prefers-color-scheme: dark)')

function subscribeToSystem(callback: () => void) {
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

// Тема берётся из настроек: light / dark / system (как в системе пользователя).
// Класс .dark на <html> переключает CSS-переменные из index.css.
export function useTheme() {
  const { theme } = useSettings()
  const systemDark = useSyncExternalStore(subscribeToSystem, () => media.matches)
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  const toggleTheme = () => updateSettings({ theme: resolved === 'dark' ? 'light' : 'dark' })

  return { theme: resolved, toggleTheme }
}
