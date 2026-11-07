import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { updateQuotation } from '@/data/store'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { LOST_REASONS, lostReasonLabels, type Quotation } from '@/types/quotation'

const OTHER = 'other'

/*
 * «Провалена»: один вопрос — почему клиент не взял. Один клик по варианту и «Сохранить».
 * Ответы собираются в аналитике «Почему проигрываем».
 */
export function LostReasonDialog({
  quotation,
  open,
  onOpenChange,
}: {
  quotation: Quotation
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [choice, setChoice] = useState<string>()
  const [other, setOther] = useState('')
  const [error, setError] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!choice) return setError(t('Pick a reason'))
    if (choice === OTHER && other.trim().length < 3) return setError(t('Write the reason in a few words'))
    updateQuotation(quotation.id, { status: 'failed', lostReason: choice === OTHER ? other.trim() : choice })
    onOpenChange(false)
    setChoice(undefined)
    setOther('')
  }

  const options = [
    ...LOST_REASONS.map((value) => ({ value, label: lostReasonLabels[value] })),
    { value: OTHER, label: 'Other' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('Why did the customer say no?')}</DialogTitle>
            <DialogDescription>
              {t('The answer goes to Analytics, so you can see why deals are lost.')}
            </DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label={t('Reason')} className="grid gap-2" data-testid="lost-reasons">
            {options.map((o) => (
              <label
                key={o.value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/50',
                  choice === o.value && 'border-primary bg-primary/5',
                )}
              >
                <input
                  type="radio"
                  name="lost-reason"
                  value={o.value}
                  checked={choice === o.value}
                  onChange={() => {
                    setChoice(o.value)
                    setError(undefined)
                  }}
                  className="accent-primary"
                />
                {t(o.label)}
              </label>
            ))}
            {choice === OTHER && (
              <Input
                autoFocus
                aria-label={t('Reason')}
                value={other}
                maxLength={120}
                placeholder={t('e.g. The cargo was cancelled')}
                onChange={(e) => {
                  setOther(e.target.value)
                  setError(undefined)
                }}
              />
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Back')}
            </Button>
            <Button type="submit">{t('Save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
