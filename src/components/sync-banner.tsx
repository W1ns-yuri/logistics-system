import { CloudOff, X } from 'lucide-react'

import { dismissSyncError, useSyncStatus } from '@/data/remote'
import { t } from '@/i18n'
import { API_MODE } from '@/lib/api'

/*
 * Рабочая сборка: сообщает, что изменение не сохранилось (сервер отказал или нет связи).
 * Пока всё в порядке — плашки нет, сохранение идёт незаметно.
 */
export function SyncBanner() {
  const { error, offline, pending } = useSyncStatus()
  if (!API_MODE || (!error && !offline)) return null
  return (
    <div
      role="alert"
      className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive sm:px-6"
    >
      {offline && <CloudOff className="size-4 shrink-0" />}
      <span className="flex-1">
        {offline
          ? t('No connection to the server. {n} changes will be saved when the connection is back.', { n: pending })
          : error}
      </span>
      {error && (
        <button
          type="button"
          onClick={dismissSyncError}
          aria-label={t('Close')}
          className="rounded p-1 hover:bg-destructive/10"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
