import { useState } from 'react'
import { ArrowLeft, Ban, CalendarPlus, LockOpen } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { InfoField } from '@/components/info-field'
import { DaysLeft, LicenseStatusBadge } from '@/components/license'
import { SectionCard } from '@/components/section-card'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import {
  changePlan,
  extendLicense,
  planLabels,
  PLANS,
  setBlocked,
  setCompanyNote,
  setLicenseUntil,
  type Plan,
} from '@/data/platform'
import { t } from '@/i18n'
import { countryLabel } from '@/lib/countries'
import { formatDate, formatDateTime } from '@/lib/format'
import { NotFoundPage } from '@/pages/not-found'
import { useCompanyRows } from './company-rows'

// Карточка компании: лицензия, продление, блокировка, заметка и история изменений
export function CompanyPage() {
  const { id } = useParams()
  const company = useCompanyRows().find((c) => c.id === id)
  const [until, setUntil] = useState('')
  const [blockOpen, setBlockOpen] = useState(false)

  if (!company) return <NotFoundPage />

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="icon-sm" aria-label={t('Back')}>
            <Link to="/platform">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
              <LicenseStatusBadge status={company.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {countryLabel(company.country)} · {t('Registered {date}', { date: formatDate(company.createdAt) })}
            </p>
          </div>
        </div>
        {company.blocked ? (
          <Button variant="outline" onClick={() => setBlocked(company.id, false)}>
            <LockOpen />
            {t('Unblock')}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setBlockOpen(true)}
          >
            <Ban />
            {t('Block')}
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <SectionCard title="Company">
          <div className="grid gap-4">
            <InfoField label="Admin">
              {company.adminName}
              <div className="text-sm text-muted-foreground">{company.adminEmail}</div>
            </InfoField>
            <InfoField label="Last active">{formatDateTime(company.lastActiveAt)}</InfoField>
            <InfoField label="Seats">
              <span className="tabular-nums">
                {company.seatsUsed} / {company.seats ?? '∞'}
              </span>
            </InfoField>
          </div>
        </SectionCard>

        <SectionCard title="License">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoField label="Paid until">
              <span className="text-lg font-semibold tabular-nums">{formatDate(company.paidUntil)}</span>{' '}
              <DaysLeft days={company.left} className="text-sm" />
            </InfoField>
            <div className="space-y-1.5">
              <label htmlFor="company-plan" className="text-xs text-muted-foreground">
                {t('Plan')}
              </label>
              <NativeSelect
                id="company-plan"
                value={company.plan}
                onChange={(e) => changePlan(company.id, e.target.value as Plan)}
              >
                {PLANS.map((plan) => (
                  <option key={plan} value={plan}>
                    {t(planLabels[plan])}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
            <Button size="sm" onClick={() => extendLicense(company.id, 1)}>
              <CalendarPlus />
              {t('+1 month')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => extendLicense(company.id, 12)}>
              <CalendarPlus />
              {t('+1 year')}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Input
                type="date"
                aria-label={t('Paid until')}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="h-8 w-40"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!until}
                onClick={() => {
                  setLicenseUntil(company.id, until)
                  setUntil('')
                }}
              >
                {t('Set date')}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('An expired license keeps the data visible but read-only. A trial becomes Start when extended.')}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Note">
        <Textarea
          aria-label={t('Note')}
          placeholder={t('e.g. paid by invoice No. 12 in cash')}
          defaultValue={company.note}
          onBlur={(e) => setCompanyNote(company.id, e.target.value)}
        />
      </SectionCard>

      <SectionCard title="History">
        <ol className="space-y-3">
          {company.events.map((event) => (
            <li key={event.id} className="flex gap-4 text-sm">
              <span className="w-36 shrink-0 text-muted-foreground tabular-nums">{formatDateTime(event.at)}</span>
              <span>
                {t(event.text, {
                  ...event.params,
                  ...(event.params?.date ? { date: formatDate(String(event.params.date)) } : {}),
                  ...(event.params?.plan ? { plan: t(String(event.params.plan)) } : {}),
                })}
              </span>
            </li>
          ))}
        </ol>
      </SectionCard>

      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Block {name}?', { name: company.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Nobody from this company can sign in until you unblock it. Their data is kept.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => setBlocked(company.id, true)}>{t('Block')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
