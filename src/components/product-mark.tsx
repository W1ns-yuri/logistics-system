import { cn } from '@/lib/utils'

/*
 * Знак продукта Omniroute. Временный: пока ждём настоящий логотип от заказчика.
 * Когда логотип придёт — меняем только этот файл и public/favicon.svg.
 */
export function ProductMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="8" className="fill-sidebar-primary" />
      <circle cx="16" cy="16" r="8" fill="none" strokeWidth="3" className="stroke-sidebar-primary-foreground" />
      <circle cx="22.5" cy="10.5" r="2.5" className="fill-sidebar-primary-foreground" />
    </svg>
  )
}
