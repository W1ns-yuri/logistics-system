import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'

// Ссылка для входа (приглашение или новый пароль) с кнопкой «Скопировать»
export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    navigator.clipboard
      ?.writeText(url)
      .then(() => setCopied(true))
      .catch(() => undefined)
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('Send this link to the person (email, WhatsApp, Telegram). It works once and expires in 7 days.')}
      </p>
      <div className="flex gap-2">
        <Input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          aria-label={t('Sign-in link')}
          data-testid="invite-link"
        />
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? t('Copied') : t('Copy link')}
        </Button>
      </div>
    </div>
  )
}
