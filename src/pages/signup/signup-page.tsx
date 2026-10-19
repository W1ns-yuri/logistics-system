import { useMemo, useState, type FormEvent } from 'react'
import { Container } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router'

import { Combobox } from '@/components/combobox'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signIn, useSession } from '@/data/auth'
import { registerCompany, TRIAL_DAYS } from '@/data/platform'
import { prefixFromName, updateSettings } from '@/data/settings'
import { startEmptyWorkspace } from '@/data/store'
import { t } from '@/i18n'
import { countryOptions } from '@/lib/countries'

type Form = { company: string; country: string; name: string; email: string; password: string; agree: boolean }
const empty: Form = { company: '', country: '', name: '', email: '', password: '', agree: false }

// Регистрация компании: создаётся компания с пробным периодом и её первый админ
export function SignupPage() {
  const session = useSession()
  const navigate = useNavigate()
  const countries = useMemo(() => countryOptions(), [])
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

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
  const prefix = prefixFromName(form.company || 'XX')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (!form.company.trim()) next.company = t('Required field')
    if (!form.country) next.country = t('Required field')
    if (!form.name.trim()) next.name = t('Required field')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = t('Enter a valid email')
    if (form.password.length < 8) next.password = t('At least 8 characters')
    if (!form.agree) next.agree = t('Required field')
    setErrors(next)
    if (Object.keys(next).length) return

    const email = form.email.trim()
    const name = form.name.trim()
    registerCompany({ name: form.company.trim(), country: form.country, adminName: name, adminEmail: email })
    startEmptyWorkspace({ name, email })
    updateSettings({
      companyName: form.company.trim(),
      companyTagline: '',
      companyAddress: form.country,
      companyEmail: email,
      documentPrefix: prefix,
    })
    signIn(email)
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/60 px-4 py-10">
      <main className="w-full max-w-[440px] rounded-xl border bg-card shadow-sm">
        <div className="px-8 pt-8 pb-7">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Container className="size-4" />
          </div>
          <h1 className="mt-6 text-xl font-semibold tracking-tight">{t('Create a company account')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('{n}-day free trial. You become the admin and invite your team later.', { n: TRIAL_DAYS })}
          </p>

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <FormField label="Company name" htmlFor="signup-company" required error={errors.company}>
              <Input
                id="signup-company"
                value={form.company}
                onChange={(e) => set({ company: e.target.value })}
                aria-invalid={!!errors.company}
              />
            </FormField>
            {form.company.trim() && (
              <p className="-mt-2 text-xs text-muted-foreground">
                {t('Document numbers will look like {example}', { example: `${prefix}000001` })}
              </p>
            )}
            <FormField label="Country" htmlFor="signup-country" required error={errors.country}>
              <Combobox
                id="signup-country"
                value={form.country}
                invalid={!!errors.country}
                options={countries}
                placeholder="Select country"
                onChange={(country) => set({ country })}
              />
            </FormField>
            <FormField label="Your name" htmlFor="signup-name" required error={errors.name}>
              <Input
                id="signup-name"
                autoComplete="name"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                aria-invalid={!!errors.name}
              />
            </FormField>
            <FormField label="Work email" htmlFor="signup-email" required error={errors.email}>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
                aria-invalid={!!errors.email}
              />
            </FormField>
            <FormField label="Password" htmlFor="signup-password" required error={errors.password}>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
                aria-invalid={!!errors.password}
              />
            </FormField>
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

            <Button type="submit" className="mt-2 h-10 w-full">
              {t('Create account')}
            </Button>
          </form>
        </div>
        <div className="border-t bg-muted/40 px-8 py-3 text-sm text-muted-foreground">
          {t('Already have an account?')}{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t('Sign in')}
          </Link>
        </div>
      </main>
    </div>
  )
}
