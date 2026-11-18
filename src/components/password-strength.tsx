import { t } from '@/i18n'
import { cn } from '@/lib/utils'

// Самые частые пароли: даже длинные, они подбираются первыми
const COMMON = /^(password|parol|qwerty|qwertyuiop|asdfgh|zxcvbn|111111|123123|12345678?9?0?|iloveyou|admin|welcome|letmein)/i

export type Strength = 0 | 1 | 2 | 3 | 4

/*
 * Оценка пароля от 0 (пусто) до 4 (отличный).
 * Длина важнее всего, потом разнообразие: строчные, заглавные, цифры, символы.
 * Это подсказка человеку, а не правило: минимальные требования проверяет форма (8 символов, буквы и цифра).
 */
export function passwordStrength(password: string): Strength {
  if (!password) return 0
  const kinds = [/[a-zа-яё]/, /[A-ZА-ЯЁ]/, /\d/, /[^\p{L}\d]/u].filter((re) => re.test(password)).length
  const repeats = /^(.)\1+$/.test(password)
  if (password.length < 8 || kinds < 2 || repeats || COMMON.test(password)) return 1
  if (password.length >= 12 && kinds >= 4) return 4
  if (password.length >= 14 && kinds >= 3) return 4
  if (password.length >= 10 && kinds >= 3) return 3
  return 2
}

const LEVELS = {
  1: { label: 'Weak password', hint: 'Use at least 8 characters with letters and digits.', bar: 'bg-destructive', text: 'text-destructive' },
  2: { label: 'Fair password', hint: 'Add capital letters or symbols like ! or # to make it stronger.', bar: 'bg-warning', text: 'text-warning-text' },
  3: { label: 'Good password', hint: 'Make it 12 characters or longer with a symbol to make it excellent.', bar: 'bg-success', text: 'text-success' },
  4: { label: 'Excellent password', hint: '', bar: 'bg-success', text: 'text-success' },
} as const

// Полоска под полем пароля: 4 деления, название уровня и что добавить
export function PasswordStrength({ password, className }: { password: string; className?: string }) {
  const level = passwordStrength(password)
  if (!level) return null
  const info = LEVELS[level]
  return (
    <div className={cn('space-y-1', className)} aria-live="polite" data-testid="password-strength">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn('h-1 flex-1 rounded-full transition-colors', step <= level ? info.bar : 'bg-muted')}
          />
        ))}
      </div>
      <p className="text-xs">
        <span className={cn('font-medium', info.text)}>{t(info.label)}</span>
        {info.hint && <span className="text-muted-foreground"> · {t(info.hint)}</span>}
      </p>
    </div>
  )
}
