import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'

import { AuthLayout } from '@/components/auth-layout'
import { Combobox } from '@/components/combobox'
import { FormField } from '@/components/form-field'
import { TransportModeIcon } from '@/components/transport-mode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { signIn, useSession } from '@/data/auth'
import {
  planLabels,
  planPrice,
  planSeats,
  registerCompany,
  TEAM_SIZES,
  useCompanies,
  TRIAL_DAYS,
  type Plan,
  type TeamSize,
} from '@/data/platform'
import { prefixFromName, updateSettings } from '@/data/settings'
import { startEmptyWorkspace } from '@/data/store'
import { t } from '@/i18n'
import { citySuggestions, countryOptions } from '@/lib/countries'
import { isValidEmail, isValidPhone } from '@/lib/input-rules'
import { cn } from '@/lib/utils'
import { usd } from '@/pages/analytics/format'
import { TRANSPORT_MODES, transportModeLabels, type TransportMode } from '@/types/logistics'

/*
 * Регистрация компании в три шага:
 *   1. Компания — без чего нельзя начать: название, страна, город, чем занимается, размер команды.
 *   2. Аккаунт админа — кто входит первым.
 *   3. Тариф — какой хотят после пробного периода (пока только запоминаем, платить ничего не надо).
 * Реквизиты для документов (адрес, ИНН, сайт) спрашиваем уже внутри, на главной в «С чего начать»:
 * длинная форма на входе отпугивает, а без реквизитов система всё равно работает.
 */

type Form = {
  company: string
  country: string
  city: string
  modes: TransportMode[]
  teamSize: TeamSize | ''
  website: string
  name: string
  email: string
  phone: string
  password: string
  confirm: string
  plan: Plan | 'later'
  agree: boolean
}
type Errors = Partial<Record<keyof Form, string>>

const empty: Form = {
  company: '',
  country: '',
  city: '',
  modes: [],
  teamSize: '',
  website: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  confirm: '',
  plan: 'later',
  agree: false,
}

const STEPS = [
  { title: 'Company', description: 'Who you are' },
  { title: 'Your account', description: 'How you sign in' },
  { title: 'Plan', description: 'After the trial' },
] as const

const PAID_PLANS: Plan[] = ['start', 'business', 'enterprise']

// Проверка одного шага: возвращает ошибки только его полей
// Черновик анкеты переживает обновление страницы и кнопку «Назад». Пароли не сохраняем
const DRAFT_KEY = 'signup-draft'
function loadDraft(): Form {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (raw) return { ...empty, ...JSON.parse(raw), password: '', confirm: '' }
  } catch {
    // нет sessionStorage — начинаем с пустой формы
  }
  return empty
}
function saveDraft(form: Form) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, password: '', confirm: '' }))
  } catch {
    // не сохранилось — не страшно
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

function validate(step: number, form: Form, takenEmails: string[] = []): Errors {
  const errors: Errors = {}
  if (step === 0) {
    if (form.company.trim().length < 2) errors.company = t('At least 2 characters')
    if (!form.country) errors.country = t('Required field')
    if (!form.city.trim()) errors.city = t('Required field')
    if (!form.modes.length) errors.modes = t('Pick at least one mode')
    if (!form.teamSize) errors.teamSize = t('Required field')
    if (form.website.trim() && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(form.website.trim()))
      errors.website = t('Enter a valid website, e.g. winfin.tm')
  }
  if (step === 1) {
    if (form.name.trim().length < 2) errors.name = t('At least 2 characters')
    if (!isValidEmail(form.email)) errors.email = t('Enter a valid email')
    else if (takenEmails.includes(normalizeEmail(form.email)))
      errors.email = t('A company with this email is already registered. Sign in instead.')
    if (!isValidPhone(form.phone)) errors.phone = t('Enter a valid phone number')
    if (form.password.length < 8) errors.password = t('At least 8 characters')
    else if (!/\d/.test(form.password) || !/[A-Za-zА-Яа-я]/.test(form.password))
      errors.password = t('Use letters and at least one digit')
    if (form.confirm !== form.password) errors.confirm = t('Passwords do not match')
  }
  if (step === 2 && !form.agree) errors.agree = t('Required field')
  return errors
}

export function SignupPage() {
  const session = useSession()
  const navigate = useNavigate()
  const countries = useMemo(() => countryOptions(), [])
  const companies = useCompanies()
  const takenEmails = companies.map((c) => c.adminEmail.toLowerCase())
  const [form, setForm] = useState<Form>(loadDraft)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  // Шаг живёт в адресе (?step=2): кнопка «Назад» в браузере возвращает на прошлый шаг, а не уводит со страницы
  const [params, setParams] = useSearchParams()
  const wanted = Math.min(Math.max(Number(params.get('step') ?? 1) - 1, 0), STEPS.length - 1)
  // Перескочить вперёд по ссылке нельзя: открываем первый шаг, где есть ошибки
  const firstInvalid = STEPS.findIndex((_, index) => index < wanted && Object.keys(validate(index, form)).length > 0)
  const step = firstInvalid === -1 ? wanted : firstInvalid
  const setStep = (next: number) => setParams(next ? { step: String(next + 1) } : {})

  useEffect(() => saveDraft(form), [form])

  if (session) return <Navigate to="/" replace />

  // Исправил поле — его ошибка пропадает
  const set = (patch: Partial<Form>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(patch) as (keyof Form)[]) delete next[key]
      return next
    })
  }
  const bind = (key: 'company' | 'website' | 'name' | 'email' | 'phone' | 'password' | 'confirm') => ({
    id: `signup-${key}`,
    value: form[key],
    'aria-invalid': !!errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [key]: e.target.value }),
  })
  const prefix = prefixFromName(form.company || 'XX')
  const cities = citySuggestions(form.country).map((city) => ({ value: city, label: city }))
  const toggleMode = (mode: TransportMode) =>
    set({ modes: form.modes.includes(mode) ? form.modes.filter((m) => m !== mode) : [...form.modes, mode] })

  const finish = () => {
    const email = normalizeEmail(form.email)
    const name = form.name.trim()
    const company = form.company.trim()
    const phone = form.phone.trim()
    const website = form.website.trim().replace(/^https?:\/\//i, '')
    registerCompany({
      name: company,
      country: form.country,
      adminName: name,
      adminEmail: email,
      profile: {
        city: form.city.trim(),
        phone,
        website: website || undefined,
        teamSize: form.teamSize as TeamSize,
        modes: form.modes,
        plannedPlan: form.plan === 'later' ? undefined : form.plan,
      },
    })
    startEmptyWorkspace({ name, email })
    updateSettings({
      companyName: company,
      companyTagline: '',
      companyAddress: `${form.city.trim()}, ${form.country}`,
      companyEmail: email,
      companyPhone: phone,
      companyWebsite: website,
      companyTaxId: '',
      documentPrefix: prefix,
    })
    signIn(email)
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      // ничего
    }
    navigate('/', { replace: true })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // Двойной клик по «Начать» не создаёт две компании
    if (submitting) return
    const next = validate(step, form, takenEmails)
    setErrors(next)
    if (Object.keys(next).length) return
    if (step < STEPS.length - 1) setStep(step + 1)
    else {
      setSubmitting(true)
      finish()
    }
  }

  return (
    <AuthLayout tab="signup">
      <div>
        <div className="px-6 pt-7 pb-7 sm:px-8">
          <h1 className="text-2xl font-semibold tracking-tight">{t('Create a company account')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('{n}-day free trial. No card needed. You become the admin and invite your team later.', {
              n: TRIAL_DAYS,
            })}
          </p>

          <Stepper step={step} onBack={(index) => index < step && setStep(index)} />

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            {step === 0 && (
              <>
                <FormField label="Company name" htmlFor="signup-company" required error={errors.company}>
                  <Input {...bind('company')} maxLength={80} autoFocus placeholder="Win Fin Logistics" />
                </FormField>
                {form.company.trim() && (
                  <p className="-mt-2 text-xs text-muted-foreground">
                    {t('Document numbers will look like {example}', { example: `${prefix}000001` })}
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Country" htmlFor="signup-country" required error={errors.country}>
                    <Combobox
                      id="signup-country"
                      value={form.country}
                      invalid={!!errors.country}
                      options={countries}
                      placeholder="Select country"
                      onChange={(country) => set({ country, city: country === form.country ? form.city : '' })}
                    />
                  </FormField>
                  <FormField label="City" htmlFor="signup-city" required error={errors.city}>
                    <Combobox
                      id="signup-city"
                      value={form.city}
                      invalid={!!errors.city}
                      options={cities}
                      placeholder="Select or type a city"
                      allowCustom
                      onChange={(city) => set({ city })}
                    />
                  </FormField>
                </div>
                <FormField label="What do you transport?" required error={errors.modes}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TRANSPORT_MODES.map((mode) => {
                      const on = form.modes.includes(mode)
                      return (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleMode(mode)}
                          className={cn(
                            'flex h-9 items-center justify-center gap-2 rounded-md border text-sm transition-colors hover:bg-accent',
                            on && 'border-primary bg-primary/5 text-primary ring-1 ring-primary',
                          )}
                        >
                          <TransportModeIcon mode={mode} />
                          {t(transportModeLabels[mode])}
                        </button>
                      )
                    })}
                  </div>
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Team size" htmlFor="signup-teamSize" required error={errors.teamSize}>
                    <NativeSelect
                      id="signup-teamSize"
                      value={form.teamSize}
                      aria-invalid={!!errors.teamSize}
                      onChange={(e) => set({ teamSize: e.target.value as TeamSize })}
                    >
                      <option value="" disabled>
                        {t('Select…')}
                      </option>
                      {TEAM_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {t('{n} people', { n: size })}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormField>
                  <FormField label="Website" htmlFor="signup-website" error={errors.website}>
                    <Input {...bind('website')} maxLength={100} placeholder="winfin.tm" />
                  </FormField>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <FormField label="Your name" htmlFor="signup-name" required error={errors.name}>
                  <Input {...bind('name')} maxLength={80} autoComplete="name" autoFocus />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Work email" htmlFor="signup-email" required error={errors.email}>
                    <Input {...bind('email')} type="email" autoComplete="email" />
                  </FormField>
                  <FormField label="Phone" htmlFor="signup-phone" required error={errors.phone}>
                    <Input {...bind('phone')} type="tel" autoComplete="tel" placeholder="+993 12 345678" />
                  </FormField>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Password" htmlFor="signup-password" required error={errors.password}>
                    <Input {...bind('password')} type="password" autoComplete="new-password" />
                  </FormField>
                  <FormField label="Repeat password" htmlFor="signup-confirm" required error={errors.confirm}>
                    <Input {...bind('confirm')} type="password" autoComplete="new-password" />
                  </FormField>
                </div>
                <p className="text-xs text-muted-foreground">{t('At least 8 characters, letters and digits.')}</p>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t('The first {n} days are free on any plan. Pick what you want after the trial, or decide later.', {
                    n: TRIAL_DAYS,
                  })}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PAID_PLANS.map((plan) => (
                    <PlanCard key={plan} selected={form.plan === plan} onClick={() => set({ plan })}>
                      <div className="text-sm font-semibold">{t(planLabels[plan])}</div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-xl font-semibold tabular-nums">{usd(planPrice[plan])}</span>
                        <span className="text-xs text-muted-foreground">/ {t('mo')}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {planSeats[plan] === null ? t('Unlimited users') : t('Up to {n} users', { n: planSeats[plan] })}
                      </div>
                    </PlanCard>
                  ))}
                </div>
                <PlanCard selected={form.plan === 'later'} onClick={() => set({ plan: 'later' })}>
                  <div className="text-sm font-medium">{t('Decide later')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('Use the trial first. We will remind you before it ends.')}
                  </div>
                </PlanCard>
                <label className="flex items-start gap-2 pt-1 text-sm text-muted-foreground">
                  <input
                    id="signup-agree"
                    type="checkbox"
                    checked={form.agree}
                    onChange={(e) => set({ agree: e.target.checked })}
                    className="mt-0.5 size-4 rounded border-input accent-primary"
                  />
                  <span className={errors.agree ? 'text-destructive' : undefined}>
                    {t('I agree to the terms of service and privacy policy')}
                  </span>
                </label>
                {errors.agree && (
                  <p className="-mt-2 text-xs text-destructive">{t('Please accept the terms to continue')}</p>
                )}
              </>
            )}

            <div className="flex items-center gap-2 pt-2">
              {step > 0 && (
                <Button type="button" variant="outline" className="h-10" onClick={() => setStep(step - 1)}>
                  <ArrowLeft />
                  {t('Back')}
                </Button>
              )}
              <Button type="submit" className="h-10 flex-1" disabled={submitting}>
                {step < STEPS.length - 1 ? (
                  <>
                    {t('Continue')}
                    <ArrowRight />
                  </>
                ) : (
                  t('Start free trial')
                )}
              </Button>
            </div>
          </form>
        </div>
        <div className="border-t bg-muted/40 px-8 py-3 text-sm text-muted-foreground">
          {t('Already have an account?')}{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t('Sign in')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}

// Шаги сверху: где ты сейчас. На пройденный шаг можно вернуться кликом
function Stepper({ step, onBack }: { step: number; onBack: (index: number) => void }) {
  return (
    <ol className="mt-6 grid grid-cols-3 gap-2" aria-label={t('Sign-up steps')}>
      {STEPS.map((item, index) => {
        const done = index < step
        const current = index === step
        return (
          <li key={item.title}>
            <button
              type="button"
              disabled={!done}
              onClick={() => onBack(index)}
              aria-current={current ? 'step' : undefined}
              className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
            >
              <span className={cn('h-1 rounded-full bg-muted', (done || current) && 'bg-primary')} />
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums',
                    current && 'border-primary text-primary',
                    done && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {done ? <Check className="size-3" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn('block truncate text-sm font-medium', !current && !done && 'text-muted-foreground')}
                  >
                    {t(item.title)}
                  </span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">{t(item.description)}</span>
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function PlanCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent',
        selected && 'border-primary bg-primary/5 ring-1 ring-primary',
      )}
    >
      {children}
    </button>
  )
}
