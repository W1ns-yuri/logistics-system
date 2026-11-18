import { useState } from 'react'
import { Mail, MessageCircle, Send } from 'lucide-react'

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
        {t('We do not email the person ourselves. Send them this link in any messenger or by email. It works once and expires in 7 days.')}
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
      {/* Быстро переслать ссылку: откроется почта или мессенджер с готовым текстом */}
      <div className="flex flex-wrap gap-2">
        {shareTargets(url).map((target) => (
          <Button key={target.label} asChild size="sm" variant="outline">
            <a href={target.href} target="_blank" rel="noreferrer">
              <target.icon />
              {t(target.label)}
            </a>
          </Button>
        ))}
      </div>
    </div>
  )
}

function shareTargets(url: string) {
  const text = t('Your sign-in link to the system: {url}', { url })
  return [
    { label: 'Send by email', icon: Mail, href: `mailto:?subject=${encodeURIComponent(t('Invitation to the system'))}&body=${encodeURIComponent(text)}` },
    { label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(text)}` },
    { label: 'Telegram', icon: Send, href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(t('Your sign-in link to the system'))}` },
  ]
}
