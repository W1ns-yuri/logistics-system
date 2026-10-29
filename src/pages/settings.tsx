import { useState } from 'react'
import { Database, Monitor, Moon, Pencil, RotateCcw, Sun, Trash2, UserPlus, Wand2 } from 'lucide-react'
import { useSearchParams } from 'react-router'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions, useSession } from '@/data/auth'
import { daysLeft, licenseStatus, planLabels, seatLimit, switchToDemoCompany, useCurrentCompany } from '@/data/platform'
import { prefixFromName, resetSettings, updateSettings, useSettings, type Settings, type Theme } from '@/data/settings'
import { addTeamMember, removeTeamMember, resetDemoData, updateTeamMember, useTeam } from '@/data/store'
import { LANGUAGES, t, type Language } from '@/i18n'
import { formatDate } from '@/lib/format'
import { isValidEmail, isValidPhone } from '@/lib/input-rules'
import { phoneExample } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { CURRENCIES, type Currency } from '@/types/logistics'
import { ROLES, roleDescriptions, roleLabels, type Role, type TeamMember } from '@/types/team'

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const TABS = [
  { value: 'company', label: 'Company' },
  { value: 'team', label: 'Team and roles', admin: true },
  { value: 'subscription', label: 'Subscription', admin: true },
  { value: 'preferences', label: 'Preferences' },
] as const
type Tab = (typeof TABS)[number]['value']

// Настройки разложены по вкладкам. Вкладка живёт в адресе (?tab=team), чтобы на неё можно было дать ссылку
export function SettingsPage() {
  const { canManageTeam } = usePermissions()
  const [params, setParams] = useSearchParams()
  const tabs = TABS.filter((tab) => !('admin' in tab) || canManageTeam)
  const wanted = params.get('tab')
  const tab: Tab = tabs.find((item) => item.value === wanted)?.value ?? 'company'

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <PageHeader title="Settings" description="Company details, team, subscription and personal preferences." />

      <Tabs
        value={tab}
        onValueChange={(value) => setParams(value === 'company' ? {} : { tab: value }, { replace: true })}
      >
        <TabsList>
          {tabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {t(item.label)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="company" className="mt-5 space-y-5">
          <CompanySection />
          <NumbersSection />
        </TabsContent>
        {canManageTeam && (
          <TabsContent value="team" className="mt-5">
            <TeamSection />
          </TabsContent>
        )}
        {canManageTeam && (
          <TabsContent value="subscription" className="mt-5">
            <SubscriptionSection />
          </TabsContent>
        )}
        <TabsContent value="preferences" className="mt-5 space-y-5">
          <PreferencesSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type CompanyDraft = Pick<
  Settings,
  'companyName' | 'companyAddress' | 'companyEmail' | 'companyPhone' | 'companyTaxId' | 'companyWebsite'
>
const COMPANY_KEYS: (keyof CompanyDraft)[] = [
  'companyName',
  'companyAddress',
  'companyEmail',
  'companyPhone',
  'companyTaxId',
  'companyWebsite',
]

// Реквизиты компании: по умолчанию только просмотр, менять — через «Изменить» (только админ)
function CompanySection() {
  const settings = useSettings()
  const { canManageTeam } = usePermissions()
  const company = useCurrentCompany()
  const [draft, setDraft] = useState<CompanyDraft>()
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyDraft, string>>>({})

  const startEdit = () => {
    setDraft(Object.fromEntries(COMPANY_KEYS.map((key) => [key, String(settings[key] ?? '')])) as CompanyDraft)
    setErrors({})
  }
  const field = (key: keyof CompanyDraft) => ({
    id: key,
    value: draft?.[key] ?? '',
    'aria-invalid': !!errors[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => prev && { ...prev, [key]: event.target.value })
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    },
  })

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft) return
    const next: typeof errors = {}
    if (draft.companyName.trim().length < 2) next.companyName = t('At least 2 characters')
    if (!draft.companyAddress.trim()) next.companyAddress = t('Required field')
    if (!isValidEmail(draft.companyEmail)) next.companyEmail = t('Enter a valid email')
    if (!isValidPhone(draft.companyPhone)) next.companyPhone = t('Enter a valid phone number')
    if (draft.companyWebsite.trim() && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(draft.companyWebsite.trim()))
      next.companyWebsite = t('Enter a valid website, e.g. winfin.tm')
    setErrors(next)
    if (Object.keys(next).length) return
    updateSettings(Object.fromEntries(COMPANY_KEYS.map((key) => [key, draft[key].trim()])) as Partial<Settings>)
    setDraft(undefined)
  }

  const view = (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <InfoField label="Company name">{settings.companyName}</InfoField>
      <InfoField label="Address">{settings.companyAddress}</InfoField>
      <InfoField label="Email">{settings.companyEmail}</InfoField>
      <InfoField label="Phone">{settings.companyPhone}</InfoField>
      <InfoField label="Tax ID">{settings.companyTaxId}</InfoField>
      <InfoField label="Website">{settings.companyWebsite}</InfoField>
    </div>
  )

  return (
    <SectionCard
      title="Company details"
      action={
        canManageTeam &&
        !draft && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil />
            {t('Edit')}
          </Button>
        )
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {t('Printed in the header of quotation and invoice PDFs, so customers see who sends them.')}
      </p>
      {!draft ? (
        view
      ) : (
        <form onSubmit={save} noValidate className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Company name" htmlFor="companyName" required error={errors.companyName}>
              <Input {...field('companyName')} maxLength={80} placeholder={t('Your company name')} />
            </FormField>
            <FormField
              label="Address"
              htmlFor="companyAddress"
              required
              error={errors.companyAddress}
              hint="Legal or office address. Printed on quotations and invoices."
            >
              <Input {...field('companyAddress')} maxLength={160} placeholder={t('Street, building, city, country')} />
            </FormField>
            <FormField label="Email" htmlFor="companyEmail" required error={errors.companyEmail}>
              <Input {...field('companyEmail')} type="email" maxLength={100} placeholder="info@company.com" />
            </FormField>
            <FormField label="Phone" htmlFor="companyPhone" required error={errors.companyPhone}>
              <Input
                {...field('companyPhone')}
                type="tel"
                maxLength={20}
                placeholder={phoneExample(company?.country)}
              />
            </FormField>
            <FormField
              label="Tax ID"
              htmlFor="companyTaxId"
              error={errors.companyTaxId}
              hint="Your company tax number. Invoices to companies usually must show it. Leave empty if you do not need it."
            >
              <Input {...field('companyTaxId')} maxLength={30} placeholder={t('e.g. 101234567890')} />
            </FormField>
            <FormField
              label="Website"
              htmlFor="companyWebsite"
              error={errors.companyWebsite}
              hint="Optional. Printed next to the contacts on PDFs."
            >
              <Input {...field('companyWebsite')} maxLength={100} placeholder="company.com" />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDraft(undefined)}>
              {t('Cancel')}
            </Button>
            <Button type="submit">{t('Save changes')}</Button>
          </div>
        </form>
      )}
    </SectionCard>
  )
}

// Префикс номеров документов
function NumbersSection() {
  const settings = useSettings()
  const { canManageTeam } = usePermissions()
  const prefix = settings.documentPrefix || 'XX'
  return (
    <SectionCard title="Document numbers">
      <FormField
        label="Prefix"
        htmlFor="documentPrefix"
        hint="Two to four Latin letters at the start of every number, usually your company initials."
      >
        <div className="flex max-w-md gap-2">
          <Input
            id="documentPrefix"
            maxLength={4}
            className="w-28"
            disabled={!canManageTeam}
            value={settings.documentPrefix}
            placeholder="AB"
            onChange={(event) =>
              updateSettings({ documentPrefix: event.target.value.toUpperCase().replace(/[^A-Z]/g, '') })
            }
          />
          {canManageTeam && (
            <Button
              variant="outline"
              onClick={() => updateSettings({ documentPrefix: prefixFromName(settings.companyName) })}
            >
              <Wand2 />
              {t('From company name')}
            </Button>
          )}
        </div>
      </FormField>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        {[
          ['Quotation', `${prefix}000001`],
          ['Shipment', `SHP-${prefix}-000001`],
          ['Invoice', `INV-${prefix}-000001`],
        ].map(([label, example]) => (
          <div key={label} className="rounded-lg border bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">{t(label!)}</div>
            <div className="font-medium tabular-nums">{example}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {t(
          'Quotations and shipments are numbered separately, each from 1. A shipment shows which quotation it came from.',
        )}
      </p>
    </SectionCard>
  )
}

// Личные предпочтения: язык, тема, уведомления, значения по умолчанию
function PreferencesSection() {
  const settings = useSettings()
  const { canManageTeam } = usePermissions()
  const [resetOpen, setResetOpen] = useState(false)

  return (
    <>
      <SectionCard title="Language and appearance">
        <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t('Language')}</div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((language) => (
                <ChoiceButton
                  key={language.value}
                  selected={settings.language === language.value}
                  onClick={() => updateSettings({ language: language.value as Language })}
                >
                  {language.label}
                </ChoiceButton>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{t('Theme')}</div>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <ChoiceButton
                  key={value}
                  selected={settings.theme === value}
                  onClick={() => updateSettings({ theme: value })}
                >
                  <Icon className="size-4" />
                  {t(label)}
                </ChoiceButton>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Quotation defaults">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Default currency"
            htmlFor="defaultCurrency"
            hint="New quotations start in this currency. You can change it in each quotation."
          >
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
          <FormField
            label="Quotation valid for (days)"
            htmlFor="quotationValidityDays"
            hint="How many days the price is valid. Printed on the quotation PDF."
          >
            <Input
              id="quotationValidityDays"
              type="number"
              min={1}
              max={90}
              value={settings.quotationValidityDays}
              onChange={(event) =>
                updateSettings({ quotationValidityDays: Math.min(90, Math.max(1, Number(event.target.value) || 1)) })
              }
            />
          </FormField>
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetSettings}>
                <RotateCcw />
                {t('Reset settings')}
              </Button>
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <Database />
                {t('Reset demo data')}
              </Button>
            </div>
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
    </>
  )
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors hover:bg-accent',
        selected && 'border-primary bg-primary/5 text-primary ring-1 ring-primary',
      )}
    >
      {children}
    </button>
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
        {t('To renew or change the plan, contact us: {email}', { email: 'support@omniroute.app' })}
      </p>
    </SectionCard>
  )
}

// Команда компании: админ добавляет людей, меняет их данные и роли
function TeamSection() {
  const team = useTeam()
  const session = useSession()
  const company = useCurrentCompany()
  const [editing, setEditing] = useState<TeamMember | 'new'>()
  const [removing, setRemoving] = useState<TeamMember>()
  // Лимит мест по тарифу: команда заполнена — новых не добавить
  const limit = company ? seatLimit(company) : null
  const full = limit !== null && team.length >= limit

  return (
    <SectionCard
      title="Team and roles"
      action={
        <div className="flex items-center gap-3">
          {full && <span className="text-xs text-muted-foreground">{t('All {n} seats are taken', { n: limit })}</span>}
          <Button size="sm" variant="outline" disabled={full} onClick={() => setEditing('new')}>
            <UserPlus />
            {t('Add person')}
          </Button>
        </div>
      }
    >
      <div className="divide-y">
        {team.map((member) => {
          const me = member.email === session?.email
          return (
            <div key={member.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {member.name}
                  {me && <span className="ml-2 text-xs font-normal text-muted-foreground">{t('(you)')}</span>}
                </div>
                <div className="text-sm text-muted-foreground">{member.email}</div>
              </div>
              <span className="text-sm text-muted-foreground">{t(roleLabels[member.role])}</span>
              <Button variant="ghost" size="icon-sm" aria-label={t('Edit')} onClick={() => setEditing(member)}>
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('Remove')}
                disabled={me}
                onClick={() => setRemoving(member)}
              >
                <Trash2 />
              </Button>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-2 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-3">
        {ROLES.map((role) => (
          <div key={role}>
            <div className="font-medium">{t(roleLabels[role])}</div>
            <div className="text-muted-foreground">{t(roleDescriptions[role])}</div>
          </div>
        ))}
      </div>

      <MemberDialog
        member={editing === 'new' ? undefined : editing}
        open={!!editing}
        self={editing !== 'new' && editing?.email === session?.email}
        onOpenChange={(open) => !open && setEditing(undefined)}
      />
      <ConfirmDelete
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={t('Remove {name} from the team?', { name: removing?.name ?? '' })}
        description="The person will no longer be able to sign in. Their quotations and shipments stay."
        confirmLabel="Remove"
        onConfirm={() => removing && removeTeamMember(removing.id)}
      />
    </SectionCard>
  )
}

// Добавить или изменить сотрудника. Новому человеку уходит приглашение: пароль он задаёт сам
function MemberDialog({
  member,
  open,
  self,
  onOpenChange,
}: {
  member?: TeamMember
  open: boolean
  self: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? t('Edit {name}', { name: member.name }) : t('Add person')}</DialogTitle>
        </DialogHeader>
        {open && <MemberForm member={member} self={self} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function MemberForm({ member, self, onDone }: { member?: TeamMember; self: boolean; onDone: () => void }) {
  const team = useTeam()
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [role, setRole] = useState<Role>(member?.role ?? 'employee')
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [invited, setInvited] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const address = email.trim().toLowerCase()
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = t('At least 2 characters')
    if (!isValidEmail(address)) next.email = t('Enter a valid email')
    else if (team.some((m) => m.id !== member?.id && m.email.toLowerCase() === address))
      next.email = t('This email is already in the team')
    setErrors(next)
    if (Object.keys(next).length) return
    if (member) {
      updateTeamMember(member.id, { name: name.trim(), email: address, role })
      onDone()
    } else {
      addTeamMember({ name: name.trim(), email: address, role })
      setInvited(address)
    }
  }

  if (invited)
    return (
      <div className="space-y-4">
        <p className="text-sm">{t('Invitation sent to {email}.', { email: invited })}</p>
        <p className="text-sm text-muted-foreground">
          {t(
            'The person opens the link from the email, sets their own password and signs in with this email. You never need to know their password.',
          )}
        </p>
        <DialogFooter>
          <Button onClick={onDone}>{t('Done')}</Button>
        </DialogFooter>
      </div>
    )

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormField label="Name" htmlFor="member-name" required error={errors.name}>
        <Input
          id="member-name"
          value={name}
          aria-invalid={!!errors.name}
          maxLength={80}
          placeholder={t('First and last name')}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      <FormField
        label="Email"
        htmlFor="member-email"
        required
        error={errors.email}
        hint="The person signs in with this email. The company is found by the email, so no company name is needed at sign-in."
      >
        <Input
          id="member-email"
          type="email"
          value={email}
          aria-invalid={!!errors.email}
          maxLength={100}
          disabled={self}
          placeholder="name@company.com"
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField label="Role" htmlFor="member-role">
        <NativeSelect id="member-role" value={role} disabled={self} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {t(roleLabels[item])}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <p className="text-sm text-muted-foreground">{t(roleDescriptions[role])}</p>
      {self && <p className="text-xs text-muted-foreground">{t('You cannot change your own role or email.')}</p>}
      {!member && (
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          {t('We will email an invitation. The person sets their own password.')}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button type="submit">{member ? t('Save changes') : t('Send invitation')}</Button>
      </DialogFooter>
    </form>
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
