import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { PageHeader } from '@/components/page-header'
import { loadFeedback, useFeedback } from '@/data/feedback'
import { t } from '@/i18n'
import { apiErrorText } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

// Что пишут сотрудники компаний через «Предложить улучшение», новые сверху
export function FeedbackPage() {
  const items = useFeedback()
  const [error, setError] = useState('')
  useEffect(() => {
    loadFeedback().catch((e: unknown) => setError(t(apiErrorText(e))))
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Feedback"
        description="Ideas and problems sent by people in client companies with the Suggest an improvement button."
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {items.length ? (
        <ul className="space-y-3" data-testid="feedback-list">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="font-medium">{item.userName || item.userEmail}</span>
                  {item.companyId ? (
                    <Link to={`/platform/companies/${item.companyId}`} className="ml-2 text-primary hover:underline">
                      {item.companyName}
                    </Link>
                  ) : (
                    <span className="ml-2 text-muted-foreground">{item.companyName}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(item.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{item.text}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                {item.userEmail}
                {item.page && ` · ${t('page')} ${item.page}`}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
          {t('No messages yet')}
        </div>
      )}
    </div>
  )
}
