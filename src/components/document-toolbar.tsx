import { Copy, FolderOpen, Plus, Trash2, Truck } from 'lucide-react'

import { Button } from '@/components/ui/button'

// Тулбар из презентации: New / Open / Copy / Create shipment / Delete.
// Open, Copy и Delete неактивны, пока в таблице не выбрана строка (появится вместе с таблицей).
export function DocumentToolbar({ withCreateShipment = false }: { withCreateShipment?: boolean }) {
  return (
    <>
      <Button size="sm">
        <Plus />
        New
      </Button>
      <Button size="sm" variant="outline" disabled>
        <FolderOpen />
        Open
      </Button>
      <Button size="sm" variant="outline" disabled>
        <Copy />
        Copy
      </Button>
      {withCreateShipment && (
        <Button size="sm" variant="outline" disabled>
          <Truck />
          Create shipment
        </Button>
      )}
      <Button size="sm" variant="outline" disabled className="text-destructive">
        <Trash2 />
        Delete
      </Button>
    </>
  )
}
