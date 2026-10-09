import type { ReactNode } from 'react'
import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { resetSettings, updateSettings, useSettings, type Settings, type Theme } from '@/data/settings'
import { cn } from '@/lib/utils'
import type { Currency } from '@/types/logistics'

const CURRENCIES: Currency[] = ['USD', 'EUR', 'AED', 'TMT']

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// Настройки сохраняются сразу при вводе — кнопки «Save» нет, изменения видно мгновенно
export function SettingsPage() {
  const settings = useSettings()

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
            Reset to defaults
          </Button>
        }
      />

      <SectionCard title="Company">
        <p className="mb-4 text-sm text-muted-foreground">
          Shown in the sidebar and later on quotation and invoice PDFs.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name">
            <Input {...text('companyName')} />
          </Field>
          <Field label="Tagline">
            <Input {...text('companyTagline')} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input {...text('companyAddress')} />
          </Field>
          <Field label="Email">
            <Input type="email" {...text('companyEmail')} />
          </Field>
          <Field label="Phone">
            <Input {...text('companyPhone')} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            <Input {...text('userName')} />
          </Field>
          <Field label="Role">
            <Input {...text('userRole')} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Quotation defaults">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default currency">
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
          </Field>
          <Field label="Quotation valid for (days)">
            <Input
              id="quotationValidityDays"
              type="number"
              min={1}
              max={90}
              value={settings.quotationValidityDays}
              onChange={(event) => updateSettings({ quotationValidityDays: Number(event.target.value) || 1 })}
            />
          </Field>
        </div>
      </SectionCard>

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
              {label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Notifications">
        <div className="divide-y">
          <ToggleRow
            title="Shipment status changes"
            description="Loaded, at port, delivered and other tracking updates."
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
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {children}
    </div>
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
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
