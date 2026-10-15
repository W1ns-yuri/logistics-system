import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { usePermissions } from '@/data/auth'
import { t } from '@/i18n'

// Кнопки для справочников (клиенты, вендоры): New / Edit / Delete выбранной строки
export function DirectoryActions({
  hasSelection,
  onNew,
  onEdit,
  onDelete,
}: {
  hasSelection: boolean
  onNew: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { canEditOrders } = usePermissions()
  if (!canEditOrders) return null
  return (
    <>
      <Button size="sm" onClick={onNew}>
        <Plus />
        {t('New')}
      </Button>
      <Button size="sm" variant="outline" disabled={!hasSelection} onClick={onEdit}>
        <Pencil />
        {t('Edit')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!hasSelection}
        onClick={onDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
        {t('Delete')}
      </Button>
    </>
  )
}
