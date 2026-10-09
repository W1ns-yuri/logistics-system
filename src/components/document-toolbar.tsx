import { Copy, FolderOpen, Plus, Trash2, Truck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type DocumentToolbarProps = {
  hasSelection: boolean
  onOpen?: () => void
  onCopy?: () => void
  onCreateShipment?: () => void
  onDelete?: () => void
  createShipmentDisabled?: boolean
}

// Тулбар из презентации: New / Open / Copy / Create shipment / Delete.
// Кнопки работают с выбранной строкой таблицы, поэтому без выбора они неактивны.
export function DocumentToolbar({
  hasSelection,
  onOpen,
  onCopy,
  onCreateShipment,
  onDelete,
  createShipmentDisabled,
}: DocumentToolbarProps) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span нужен, чтобы подсказка показывалась и на неактивной кнопке */}
          <span>
            <Button size="sm" disabled>
              <Plus />
              New
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Creation form comes in the next step</TooltipContent>
      </Tooltip>
      <Button size="sm" variant="outline" disabled={!hasSelection} onClick={onOpen}>
        <FolderOpen />
        Open
      </Button>
      <Button size="sm" variant="outline" disabled={!hasSelection} onClick={onCopy}>
        <Copy />
        Copy
      </Button>
      {onCreateShipment && (
        <Button
          size="sm"
          variant="outline"
          disabled={!hasSelection || createShipmentDisabled}
          onClick={onCreateShipment}
        >
          <Truck />
          Create shipment
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={!hasSelection}
        onClick={onDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
        Delete
      </Button>
    </>
  )
}
