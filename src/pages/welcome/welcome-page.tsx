import { useState } from 'react'
import { Check } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router'

import { PlanPurchase } from '@/components/plan-purchase'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/data/auth'
import { updateSettings, useSettings } from '@/data/settings'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { CompanySection, LogoSection, TeamSection } from '@/pages/settings'

/*
 * Первая настройка после регистрации: реквизиты (ИНН, адрес), логотип, команда, тариф.
 * Всё можно пропустить и сделать потом в Настройках. Показываем один раз — пока админ не закончит или не пропустит.
 */
const STEPS = ['Company details', 'Logo', 'Team', 'Plan'] as const

export function WelcomePage() {
  const { role } = usePermissions()
  const settings = useSettings()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  if (role !== 'admin') return <Navigate to="/" replace />

  const finish = () => {
    updateSettings({ onboardingDone: true })
    navigate('/', { replace: true })
  }
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish())

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6" data-testid="welcome">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('Welcome, {company}!', { company: settings.companyName })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Four short steps so documents look right and colleagues can join. Everything can be changed later in Settings.')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={finish}>
          {t('Skip for now')}
        </Button>
      </div>

      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              aria-current={index === step ? 'step' : undefined}
              className={cn(
                'flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-xs sm:text-sm',
                index === step ? 'border-primary bg-primary/5 font-medium' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]',
                  index < step ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {index < step ? <Check className="size-3" /> : index + 1}
              </span>
              <span className="truncate">{t(label)}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && <CompanySection onSaved={next} />}
      {step === 1 && <LogoSection />}
      {step === 2 && <TeamSection />}
      {step === 3 && (
        <SectionCard title="Plan">
          <p className="mb-4 text-sm text-muted-foreground">
            {t('You are on a free trial with all features. Choose the plan for after it and send a request: we will contact you with payment details.')}
          </p>
          <PlanPurchase />
        </SectionCard>
      )}

      {step > 0 && (
        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            {t('Back')}
          </Button>
          <Button onClick={next}>{step === STEPS.length - 1 ? t('Go to the system') : t('Next')}</Button>
        </div>
      )}
    </div>
  )
}
