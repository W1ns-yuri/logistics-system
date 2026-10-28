import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { t } from '@/i18n'

type ConfirmDeleteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  // Текст кнопки, если это не удаление (например, «Отменить перевозку»)
  confirmLabel?: string
}

// Удаление необратимо, поэтому всегда спрашиваем подтверждение
export function ConfirmDelete({ open, onOpenChange, title, description, onConfirm, confirmLabel }: ConfirmDeleteProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{t(description)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t(confirmLabel ? 'Back' : 'Cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t(confirmLabel ?? 'Delete')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
