import { ChevronDown, Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LANGUAGES, t, type Language } from '@/i18n'

/*
 * Кнопка «Печать / PDF» с выбором языка документа. Клиенту можно отправить PDF на русском
 * или на английском, не переключая язык всей системы.
 */
export function PrintMenu({
  onPrint,
  label = t('Print / PDF'),
  size = 'sm',
  variant = 'outline',
}: {
  onPrint: (language: Language) => void
  label?: string
  size?: 'sm' | 'default'
  variant?: 'outline' | 'ghost' | 'default'
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant}>
          <Printer />
          {label}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t('Document language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang.value} onSelect={() => onPrint(lang.value)}>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Переключатель языка на самой странице печати: передумал — поменял, не закрывая вкладку
export function PrintLanguageSwitch({ value, onChange }: { value: Language; onChange: (language: Language) => void }) {
  return (
    <div className="flex rounded-md border bg-background p-0.5" role="group" aria-label={t('Document language')}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.value}
          type="button"
          aria-pressed={value === lang.value}
          onClick={() => onChange(lang.value)}
          className={
            value === lang.value
              ? 'rounded-sm bg-primary px-3 py-1 text-sm font-medium text-primary-foreground'
              : 'rounded-sm px-3 py-1 text-sm text-muted-foreground hover:text-foreground'
          }
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
