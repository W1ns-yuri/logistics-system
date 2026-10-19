import { useState } from 'react'
import { Database, Monitor, Moon, RotateCcw, Sun, Trash2, UserPlus, Wand2 } from 'lucide-react'

import { ConfirmDelete } from '@/components/confirm-delete'
import { DaysLeft, LicenseStatusBadge } from '@/components/license'
import { InfoField } from '@/components/info-field'
import { FormField } from '@/components/form-field'
import { PageHeader } from '@/components/page-header'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { usePermissions, useSession } from '@/data/auth'
import { daysLeft, licenseStatus, planLabels, seatLimit, switchToDemoCompany, useCurrentCompany } from '@/data/platform'
import { prefixFromName, resetSettings, updateSettings, useSettings, type Settings, type Theme } from '@/data/settings'
import { addTeamMember, removeTeamMember, resetDemoData, updateTeamMember, useTeam } from '@/data/store'
import { LANGUAGES, t, type Language } from '@/i18n'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CURRENCIES, type Currency } from '@/types/logistics'
import { ROLES, roleDescriptions, roleLabels, type Role } from '@/types/team'

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// Настройки сохраняются сразу при вводе — кнопки «Save» нет, изменения видно мгновенно
export function SettingsPage() {
  const settings = useSettings()
  const { canManageTeam, role } = usePermissions()
  const [resetOpen, setResetOpen] = useState(false)

  // Помощник для текстовых полей: <Input {...text('companyName')} />
  const text = (key: keyof Settings) => ({
    id: key,
    value: String(settings[key]),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateSettings({ [key]: event.target.value }),
  })

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <PageHeader
        title="Settings"
        description="Changes are saved automatically in this browser."
        actions={
          <Button size="sm" variant="outline" onClick={resetSettings}>
            <RotateCcw />
            {t('Reset to defaults')}
          </Button>
        }
      />

      <SectionCard title="Language">
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          {LANGUAGES.map((language) => (
            <button
              key={language.value}
              type="button"
              onClick={() => updateSettings({ language: language.value as Language })}
              className={cn(
                'rounded-lg border p-3 text-sm font-medium transition-colors hover:bg-accent',
                settings.language === language.value && 'border-primary bg-primary/5 text-primary ring-1 ring-primary',
              )}
            >
              {language.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Company">
        <p className="mb-4 text-sm text-muted-foreground">
          {t('Shown in the sidebar and later on quotation and invoice PDFs.')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company name" htmlFor="companyName">
            <Input {...text('companyName')} />
          </FormField>
          <FormField label="Tagline" htmlFor="companyTagline">
            <Input {...text('companyTagline')} />
          </FormField>
          <FormField label="Address" htmlFor="companyAddress" className="sm:col-span-2">
            <Input {...text('companyAddress')} />
          </FormField>
          <FormField label="Email" htmlFor="companyEmail">
            <Input type="email" {...text('companyEmail')} />
          </FormField>
          <FormField label="Phone" htmlFor="companyPhone">
            <Input {...text('companyPhone')} type="tel" />
          </FormField>
          <FormField label="Tax ID" htmlFor="companyTaxId">
            <Input {...text('companyTaxId')} maxLength={30} />
          </FormField>
          <FormField label="Website" htmlFor="companyWebsite">
            <Input {...text('companyWebsite')} maxLength={100} placeholder="winfin.tm" />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Document numbers">
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <FormField label="Prefix" htmlFor="documentPrefix">
            <div className="flex gap-2">
              <Input
                id="documentPrefix"
                maxLength={4}
                value={settings.documentPrefix}
                onChange={(event) =>
                  updateSettings({ documentPrefix: event.target.value.toUpperCase().replace(/[^A-Z]/g, '') })
                }
              />
              <Button
                variant="outline"
                onClick={() => updateSettings({ documentPrefix: prefixFromName(settings.companyName) })}
              >
                <Wand2 />
                {t('From company name')}
              </Button>
            </div>
          </FormField>
          <div className="rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{t('Next number looks like')} </span>
            <span className="font-medium tabular-nums">
              {settings.documentPrefix || 'XX'}000001 · SHP-{settings.documentPrefix || 'XX'}-000001
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t(
            'Quotations and shipments are numbered separately, each from 1. A shipment shows which quotation it came from.',
          )}
        </p>
      </SectionCard>

      <SectionCard title="Quotation defaults">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Default currency" htmlFor="defaultCurrency">
            <NativeSelect
              id="defaultCurrency"
              value={settings.defaultCurrency}
              onChange={(event) => updateSettings({ defaultCurrency: event.target.value as Currency })}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Quotation valid for (days)" htmlFor="quotationValidityDays">
            <Input
              id="quotationValidityDays"
              type="number"
              min={1}
              max={90}
              value={settings.quotationValidityDays}
              onChange={(event) => updateSettings({ quotationValidityDays: Number(event.target.value) || 1 })}
            />
          </FormField>
        </div>
      </SectionCard>

      {role === 'admin' && <SubscriptionSection />}
      {canManageTeam && <TeamSection />}

      <SectionCard title="Appearance">
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => updateSettings({ theme: value })}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors hover:bg-accent',
                settings.theme === value && 'border-primary bg-primary/5 text-primary ring-1 ring-primary',
              )}
            >
              <Icon className="size-5" />
              {t(label)}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Notifications">
        <div className="divide-y">
          <ToggleRow
            title="Shipment status changes"
            description="Loaded, in transit, delivered and other tracking updates."
            checked={settings.notifyStatusChanges}
            onChange={(value) => updateSettings({ notifyStatusChanges: value })}
          />
          <ToggleRow
            title="New quotation requests"
            description="When a customer asks for a new price."
            checked={settings.notifyNewQuotations}
            onChange={(value) => updateSettings({ notifyNewQuotations: value })}
          />
          <ToggleRow
            title="Border delays"
            description="Queues and customs holds at borders."
            checked={settings.notifyBorderDelays}
            onChange={(value) => updateSettings({ notifyBorderDelays: value })}
          />
        </div>
      </SectionCard>

      {canManageTeam && (
        <SectionCard title="Demo data">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-lg text-sm text-muted-foreground">
              {t(
                'Everything you create is saved in this browser. Reset brings back the original sample quotations, shipments and invoices.',
              )}
            </p>
            <Button variant="outline" onClick={() => setResetOpen(true)}>
              <Database />
              {t('Reset demo data')}
            </Button>
          </div>
        </SectionCard>
      )}

      <ConfirmDelete
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('Reset demo data?')}
        description="Everything you created or changed will be replaced with the sample data."
        onConfirm={() => {
          resetDemoData()
          switchToDemoCompany()
        }}
      />
    </div>
  )
}

// Лицензия компании: тариф, срок, места. Продлевает владелец платформы
function SubscriptionSection() {
  const company = useCurrentCompany()
  const team = useTeam()
  if (!company) return null
  const limit = seatLimit(company)
  return (
    <SectionCard
      title="Subscription"
      className="scroll-mt-6"
      action={<LicenseStatusBadge status={licenseStatus(company)} />}
    >
      <div id="subscription" className="grid gap-4 sm:grid-cols-3">
        <InfoField label="Plan">{t(planLabels[company.plan])}</InfoField>
        <InfoField label="Paid until">
          {formatDate(company.paidUntil)} · <DaysLeft days={daysLeft(company)} />
        </InfoField>
        <InfoField label="Seats">
          <span className="tabular-nums">
            {team.length} / {limit ?? '∞'}
          </span>
        </InfoField>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {t('To renew or change the plan, contact us: {email}', { email: 'support@logistics.app' })}
      </p>
    </SectionCard>
  )
}

// Команда компании: админ добавляет людей и раздаёт роли
function TeamSection() {
  const team = useTeam()
  const session = useSession()
  const company = useCurrentCompany()
  const [addOpen, setAddOpen] = useState(false)
  // Лимит мест по тарифу: команда заполнена — новых не добавить
  const limit = company ? seatLimit(company) : null
  const full = limit !== null && team.length >= limit

  return (
    <SectionCard
      title="Team and roles"
      action={
        <div className="flex items-center gap-3">
          {full && <span className="text-xs text-muted-foreground">{t('All {n} seats are taken', { n: limit })}</span>}
          <Button size="sm" variant="outline" disabled={full} onClick={() => setAddOpen(true)}>
            <UserPlus />
            {t('Add person')}
          </Button>
        </div>
      }
    >
      <div className="divide-y">
        {team.map((member) => (
          <div key={member.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{member.name}</div>
              <div className="text-sm text-muted-foreground">{member.email}</div>
            </div>
            <div className="w-48">
              <NativeSelect
                aria-label={t('Role')}
                value={member.role}
                disabled={member.email === session?.email}
                onChange={(event) => updateTeamMember(member.id, { role: event.target.value as Role })}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(roleLabels[role])}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('Remove')}
              disabled={member.email === session?.email}
              onClick={() => removeTeamMember(member.id)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-3">
        {ROLES.map((role) => (
          <div key={role}>
            <div className="font-medium">{t(roleLabels[role])}</div>
            <div className="text-muted-foreground">{t(roleDescriptions[role])}</div>
          </div>
        ))}
      </div>

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
    </SectionCard>
  )
}

function AddMemberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('employee')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    addTeamMember({ name: name.trim(), email: email.trim(), role })
    setName('')
    setEmail('')
    setRole('employee')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Add person')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Name" htmlFor="member-name" required>
            <Input id="member-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Email" htmlFor="member-email" required>
            <Input id="member-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Role" htmlFor="member-role">
            <NativeSelect id="member-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {t(roleLabels[item])}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <p className="text-sm text-muted-foreground">{t(roleDescriptions[role])}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit">{t('Add')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <div className="text-sm font-medium">{t(title)}</div>
        <div className="text-sm text-muted-foreground">{t(description)}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
