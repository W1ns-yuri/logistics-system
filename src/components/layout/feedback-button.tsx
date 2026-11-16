import { Check, Lightbulb } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { sendFeedback } from '@/data/feedback'
import { t } from '@/i18n'
import { apiErrorText } from '@/lib/api'

/*
 * «Предложить улучшение»: пока компании пользуются системой бесплатно, собираем, чего им не хватает.
 * Письмо уходит владельцу платформы (страница Feedback в админке), вместе со страницей, откуда написали.
 */
export function FeedbackButton() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const change = (value: boolean) => {
    setOpen(value)
    if (value) {
      setSent(false)
      setError('')
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (text.trim().length < 3) return setError(t('Write a few words'))
    setBusy(true)
    setError('')
    sendFeedback(text.trim(), pathname)
      .then(() => {
        setSent(true)
        setText('')
      })
      .catch((e: unknown) => setError(t(apiErrorText(e))))
      .finally(() => setBusy(false))
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => change(true)}
        aria-label={t('Suggest an improvement')}
        title={t('Suggest an improvement')}
        data-testid="feedback-button"
      >
        <Lightbulb />
        <span className="hidden lg:inline">{t('Suggest an improvement')}</span>
      </Button>
      <Dialog open={open} onOpenChange={change}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Suggest an improvement')}</DialogTitle>
            <DialogDescription>
              {t('What is missing, what gets in the way, or how to make the work faster? We read every message.')}
            </DialogDescription>
          </DialogHeader>
          {sent ? (
            <div className="space-y-4">
              <p className="flex items-start gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success" role="status">
                <Check className="mt-0.5 size-4 shrink-0" />
                {t('Thank you! Your message has been sent.')}
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSent(false)}>
                  {t('Write another')}
                </Button>
                <Button type="button" onClick={() => change(false)}>
                  {t('Close')}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={2000}
                rows={6}
                autoFocus
                aria-label={t('Your message')}
                placeholder={t('For example: it would be handy to see the customs status right in the shipments list')}
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => change(false)}>
                  {t('Cancel')}
                </Button>
                <Button type="submit" disabled={busy}>
                  {t('Send')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
