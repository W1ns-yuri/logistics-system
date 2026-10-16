import { Copy, FolderOpen, Pencil, Plus, Trash2, Truck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { usePermissions } from '@/data/auth'
import { t } from '@/i18n'

type DocumentToolbarProps = {
  hasSelection: boolean
  onNew?: () => void
  onOpen?: () => void
  onEdit?: () => void
  onCopy?: () => void
  onCreateShipment?: () => void
  onDelete?: () => void
  createShipmentDisabled?: boolean
}

// Тулбар из презентации: New / Open / Copy / Create shipment / Delete (+ Edit).
// Кнопки работают с выбранной строкой таблицы, поэтому без выбора они неактивны.
// Если роли нельзя менять заказы (бухгалтер), кнопки изменения скрыты.
export function DocumentToolbar({
  hasSelection,
  onNew,
  onOpen,
  onEdit,
  onCopy,
  onCreateShipment,
  onDelete,
  createShipmentDisabled,
}: DocumentToolbarProps) {
  const { canEditOrders } = usePermissions()

  return (
    <>
      {canEditOrders && onNew && (
        <Button size="sm" onClick={onNew}>
          <Plus />
          {t('New')}
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={!hasSelection} onClick={onOpen}>
        <FolderOpen />
        {t('Open')}
      </Button>
      {canEditOrders && onEdit && (
        <Button size="sm" variant="outline" disabled={!hasSelection} onClick={onEdit}>
          <Pencil />
          {t('Edit')}
        </Button>
      )}
      {canEditOrders && onCopy && (
        <Button
          size="sm"
          variant="outline"
          disabled={!hasSelection}
          onClick={onCopy}
          title={t('New document with the same customer, route and rates')}
        >
          <Copy />
          {t('Copy')}
        </Button>
      )}
      {canEditOrders && onCreateShipment && (
        <Button
          size="sm"
          variant="outline"
          disabled={!hasSelection || createShipmentDisabled}
          onClick={onCreateShipment}
        >
          <Truck />
          {t('Create shipment')}
        </Button>
      )}
      {canEditOrders && onDelete && (
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
      )}
    </>
  )
}
