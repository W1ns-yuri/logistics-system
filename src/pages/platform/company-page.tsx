import { useState } from 'react'
import { ArrowLeft, Ban, CalendarPlus, CalendarRange, KeyRound, LockOpen, Pencil, Trash2, Wallet } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { DateInput } from '@/components/date-input'
import { InfoField } from '@/components/info-field'
import { InviteLink } from '@/components/invite-link'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import {
  addDays,
  adjustLicenseDays,
  changePlan,
  dismissPlanRequest,
  issueAdminLink,
  setExtraSeats,
  periodEnd,
  planLabels,
  PLANS,
  removeLicensePayment,
  setBlocked,
  setCompanyNote,
  setLicenseUntil,
  type LicensePayment,
  type Plan,
} from '@/data/platform'
import { t } from '@/i18n'
import { API_MODE, apiErrorText } from '@/lib/api'
import { countryLabel } from '@/lib/countries'
import { transportModeLabels } from '@/types/logistics'
import { formatDate, formatDateTime } from '@/lib/format'
import { NotFoundPage } from '@/pages/not-found'
import { usd } from '@/pages/analytics/format'
import { useCompanyRows } from './company-rows'
import { RecordPaymentDialog } from './record-payment-dialog'

// Карточка компании: лицензия, продление, блокировка, заметка и история изменений
export function CompanyPage() {
  const { id } = useParams()
  const company = useCompanyRows().find((c) => c.id === id)
  const [until, setUntil] = useState('')
  const [blockOpen, setBlockOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  // Каждое открытие окна оплаты — с чистыми полями
  const [payKey, setPayKey] = useState(0)
  const [removing, setRemoving] = useState<LicensePayment | null>(null)
  const [error, setError] = useState('')
  const [adminLink, setAdminLink] = useState<{ url: string; email: string } | null>(null)
  // Каждое изменение лицензии — через окно подтверждения: случайный клик ничего не меняет
  const [confirm, setConfirm] = useState<{ title: string; text: string; action: () => Promise<void> } | null>(null)
  const [daysOpen, setDaysOpen] = useState(false)
  const [days, setDays] = useState('')
  const [seatsOpen, setSeatsOpen] = useState(false)
  const [extra, setExtra] = useState('')

  if (!company) return <NotFoundPage />
  // Действие ушло на сервер: если не вышло (нет связи, сессия кончилась) — показываем почему
  const run = (action: Promise<void> | void) => {
    setError('')
    Promise.resolve(action).catch((e: unknown) => setError(t(apiErrorText(e))))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="icon-sm" aria-label={t('Back')}>
            <Link to="/platform/companies">
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
          <Button variant="outline" onClick={() => run(setBlocked(company.id, false))}>
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

      {error && (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {company.planRequest && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
          data-testid="plan-request"
        >
          <Wallet className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="font-medium">
              {t('Wants to pay: {plan}, {n} mo.', {
                plan: t(planLabels[company.planRequest.plan]),
                n: company.planRequest.months,
              })}
            </span>{' '}
            <span className="text-muted-foreground">
              {t('requested {date}. Contact them, then record the payment.', {
                date: formatDateTime(company.planRequest.at),
              })}
            </span>
          </span>
          <Button
            size="sm"
            onClick={() => {
              setPayKey((k) => k + 1)
              setPayOpen(true)
            }}
          >
            {t('Record payment')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => run(dismissPlanRequest(company.id))}>
            {t('Close request')}
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <SectionCard title="Company">
          <div className="grid gap-4">
            <InfoField label="Admin">
              {company.adminName}
              <div className="text-sm text-muted-foreground">{company.adminEmail}</div>
              {API_MODE && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setError('')
                    issueAdminLink(company.id)
                      .then(setAdminLink)
                      .catch((e: unknown) => setError(t(apiErrorText(e))))
                  }}
                >
                  <KeyRound />
                  {t('Forgot password? Sign-in link')}
                </Button>
              )}
            </InfoField>
            {company.profile && (
              <>
                <InfoField label="Contacts">
                  {company.profile.city}, {countryLabel(company.country)}
                  <div className="text-sm text-muted-foreground">
                    {[company.profile.phone, company.profile.website].filter(Boolean).join(' · ')}
                  </div>
                </InfoField>
                <InfoField label="What they transport">
                  {company.profile.modes.map((mode) => t(transportModeLabels[mode])).join(', ')}
                  <div className="text-sm text-muted-foreground">
                    {t('Team size')}: {t('{n} people', { n: company.profile.teamSize })}
                  </div>
                </InfoField>
                <InfoField label="Plan chosen at sign-up">
                  {company.profile.plannedPlan ? t(planLabels[company.profile.plannedPlan]) : t('Decide later')}
                </InfoField>
              </>
            )}
            <InfoField label="Last active">{formatDateTime(company.lastActiveAt)}</InfoField>
            <InfoField label="Seats">
              <span className="tabular-nums">
                {company.seatsUsed} / {company.seats ?? '∞'}
              </span>
              {!!company.extraSeats && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('incl. {n} extra', { n: company.extraSeats })}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-1"
                aria-label={t('Extra users')}
                onClick={() => {
                  setExtra(String(company.extraSeats ?? 0))
                  setSeatsOpen(true)
                }}
              >
                <Pencil />
              </Button>
            </InfoField>
            <InfoField label="Paid in total">
              <span className="font-semibold tabular-nums">
                {usd(company.payments.reduce((acc, p) => acc + p.amount, 0))}
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
                onChange={(e) => {
                  const plan = e.target.value as Plan
                  setConfirm({
                    title: t('Change the plan to {plan}?', { plan: t(planLabels[plan]) }),
                    text: t('The license end date stays the same. Features and seats change right away.'),
                    action: () => changePlan(company.id, plan),
                  })
                }}
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
            <Button
              size="sm"
              onClick={() => {
                setPayKey((k) => k + 1)
                setPayOpen(true)
              }}
            >
              <CalendarPlus />
              {t('Record payment')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDays('')
                setDaysOpen(true)
              }}
            >
              <CalendarRange />
              {t('Add or remove days')}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <DateInput
                aria-label={t('Paid until')}
                value={until}
                clearable={false}
                onChange={setUntil}
                className="w-44"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!until}
                onClick={() =>
                  setConfirm({
                    title: t('Set the license end date to {date}?', { date: formatDate(until) }),
                    text: t('Now: {date}. No payment is recorded.', { date: formatDate(company.paidUntil) }),
                    action: () => setLicenseUntil(company.id, until).then(() => setUntil('')),
                  })
                }
              >
                {t('Set date')}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t(
              'An expired license keeps the data visible but read-only. A trial becomes the plan picked at sign-up (or Lite) when paid. Each payment extends the license from its current end date.',
            )}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Note">
        <Textarea
          aria-label={t('Note')}
          placeholder={t('e.g. paid by invoice No. 12 in cash')}
          defaultValue={company.note}
          onBlur={(e) => e.target.value !== company.note && run(setCompanyNote(company.id, e.target.value))}
        />
      </SectionCard>

      <SectionCard title="License payments" className="[&>div:last-child]:p-0">
        {company.payments.length ? (
          <table className="w-full text-sm">
            <tbody>
              {[...company.payments].reverse().map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-5 py-3 text-muted-foreground tabular-nums">{formatDate(p.date)}</td>
                  <td className="px-3 py-3">{t(planLabels[p.plan])}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {p.months === 12 ? t('1 year') : t('{n} mo.', { n: p.months })} ·{' '}
                    {t('until {date}', { date: formatDate(periodEnd(p.from, p.months)) })}
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">{usd(p.amount)}</td>
                  <td className="w-10 py-3 pr-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('Remove payment')}
                      onClick={() => setRemoving(p)}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-4 text-sm text-muted-foreground">{t('No payments yet.')}</p>
        )}
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
            <AlertDialogAction onClick={() => run(setBlocked(company.id, true))}>{t('Block')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Remove this payment?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'Use it only for a payment recorded by mistake. If it is the latest one, the license end date moves back.',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && run(removeLicensePayment(company.id, removing.id))}>
              {t('Remove payment')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!adminLink} onOpenChange={(open) => !open && setAdminLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Sign-in link for {email}', { email: adminLink?.email ?? '' })}</DialogTitle>
            <DialogDescription>
              {t('The admin opens it and sets a new password. The old password stops working.')}
            </DialogDescription>
          </DialogHeader>
          {adminLink && <InviteLink url={adminLink.url} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && run(confirm.action())}>{t('Confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DaysDialog
        open={daysOpen}
        onOpenChange={setDaysOpen}
        value={days}
        onValue={setDays}
        paidUntil={company.paidUntil}
        onConfirm={(n) => {
          setDaysOpen(false)
          run(adjustLicenseDays(company.id, n))
        }}
      />

      <Dialog open={seatsOpen} onOpenChange={setSeatsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('Extra users')}</DialogTitle>
            <DialogDescription>
              {t('For a team bigger than the plan allows. The plan gives {n}; these are added on top.', {
                n: (company.seats ?? 0) - (company.extraSeats ?? 0),
              })}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(extra)
              if (!Number.isInteger(n) || n < 0 || n > 1000) return
              setSeatsOpen(false)
              run(setExtraSeats(company.id, n))
            }}
          >
            <Input
              aria-label={t('Extra users')}
              inputMode="numeric"
              value={extra}
              onChange={(e) => setExtra(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSeatsOpen(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit">{t('Save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <RecordPaymentDialog key={payKey} company={company} open={payOpen} onOpenChange={setPayOpen} />
    </div>
  )
}

// Добавить или списать дни: знак выбирается кнопками, видно новую дату до подтверждения
function DaysDialog({
  open,
  onOpenChange,
  value,
  onValue,
  paidUntil,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onValue: (value: string) => void
  paidUntil: string
  onConfirm: (days: number) => void
}) {
  const [sign, setSign] = useState<1 | -1>(1)
  const n = Number(value)
  const valid = Number.isInteger(n) && n > 0 && n <= 3650
  const next = valid ? addDays(paidUntil, sign * n) : paidUntil
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('Add or remove days')}</DialogTitle>
          <DialogDescription>{t('A gift, a compensation or a fix. No payment is recorded.')}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onConfirm(sign * n)
          }}
        >
          <div className="flex gap-2">
            <Button type="button" variant={sign === 1 ? 'default' : 'outline'} onClick={() => setSign(1)}>
              {t('Add')}
            </Button>
            <Button type="button" variant={sign === -1 ? 'default' : 'outline'} onClick={() => setSign(-1)}>
              {t('Remove')}
            </Button>
            <Input
              aria-label={t('Days')}
              placeholder={t('Days')}
              inputMode="numeric"
              value={value}
              onChange={(e) => onValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            {t('Paid until')}: {formatDate(paidUntil)} → <span className="font-semibold">{formatDate(next)}</span>
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!valid}>
              {t('Confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
