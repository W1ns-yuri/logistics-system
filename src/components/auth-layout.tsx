import { Boxes } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import mapImage from '@/assets/auth-map.webp'
import { updateSettings, useSettings } from '@/data/settings'
import { LANGUAGES, t } from '@/i18n'
import { PRODUCT_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()

// Узлы на карте (в % от картинки): мигают, будто там сейчас идут грузы
const PORTS = [
  { x: 37, y: 40 },
  { x: 57, y: 30 },
  { x: 66, y: 47 },
  { x: 78, y: 51 },
  { x: 86, y: 61 },
  { x: 63, y: 79 },
]

// Карточка «в пути» внизу карты по очереди показывает разные перевозки
const LIVE = [
  { ref: 'SHP-WF-000124', route: 'Istanbul → Ashgabat', status: 'In transit', mode: 'Road' },
  { ref: 'SHP-AY-000057', route: 'Shanghai → Mersin', status: 'Loaded', mode: 'Sea' },
  { ref: 'SHP-KL-000311', route: 'Dubai → Ashgabat', status: 'Delivered', mode: 'Air' },
  { ref: 'SHP-MA-000089', route: 'Almaty → Mary', status: 'At the border', mode: 'Rail' },
]

// Общая обёртка входа и регистрации: слева тёмная панель с картой, справа форма
export function AuthLayout({ tab, children }: { tab: 'signin' | 'signup'; children: ReactNode }) {
  const settings = useSettings()

  return (
    <div className="flex min-h-svh bg-muted/40">
      <BrandPanel />

      {/* Правая половина: форма по центру. Язык и подвал не занимают высоту, чтобы на ноутбуке всё влезало без прокрутки */}
      <div className="relative flex min-w-0 flex-1 flex-col px-4 pt-5 pb-10 sm:px-8 lg:pt-14">
        {/* На телефоне левой панели нет, поэтому логотип здесь */}
        <Logo className="lg:hidden" />
        <div className="absolute top-5 right-4 flex items-center gap-1.5 text-sm sm:right-8">
          {LANGUAGES.map((lang, index) => (
            <span key={lang.value} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-muted-foreground/60">/</span>}
              <button
                type="button"
                onClick={() => updateSettings({ language: lang.value })}
                className={cn(
                  'text-muted-foreground hover:text-foreground',
                  settings.language === lang.value && 'font-medium text-foreground',
                )}
              >
                {lang.label}
              </button>
            </span>
          ))}
        </div>

        <div className="flex flex-1 items-center justify-center py-6">
          <main
            className={cn(
              'w-full rounded-xl border bg-card shadow-sm',
              tab === 'signin' ? 'max-w-[440px]' : 'max-w-[560px]',
            )}
          >
            <nav className="grid grid-cols-2 border-b text-sm font-medium" aria-label={t('Account')}>
              <AuthTab to="/login" active={tab === 'signin'}>
                {t('Sign in')}
              </AuthTab>
              <AuthTab to="/signup" active={tab === 'signup'}>
                {t('Create account')}
              </AuthTab>
            </nav>
            {children}
          </main>
        </div>

        <div className="absolute inset-x-0 bottom-4 text-center text-xs text-muted-foreground">
          © {CURRENT_YEAR} {PRODUCT_NAME} · <a href="mailto:support@omniroute.app">{t('Support')}</a>
        </div>
      </div>
    </div>
  )
}

function AuthTab({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      replace
      aria-current={active ? 'page' : undefined}
      className={cn(
        'border-b-2 py-3 text-center transition-colors',
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  )
}

function Logo({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
        <Boxes className="size-5" />
      </div>
      <div className="leading-tight">
        <div className={cn('text-lg font-semibold', onDark ? 'text-white' : 'text-foreground')}>{PRODUCT_NAME}</div>
        <div className={cn('text-xs', onDark ? 'text-slate-400' : 'text-muted-foreground')}>
          {t('Forwarding suite')}
        </div>
      </div>
    </div>
  )
}

function BrandPanel() {
  return (
    // Панель всегда ровно в высоту экрана и не прокручивается вместе с формой
    <aside className="sticky top-0 hidden h-svh w-[52%] max-w-[1000px] shrink-0 flex-col overflow-hidden bg-[#061a38] p-8 text-white lg:flex xl:p-10">
      <Logo onDark />

      {/* Ширина карты зависит от высоты экрана: на низком ноутбуке карта меньше, заголовок не уезжает вниз */}
      <div className="relative mx-auto my-auto w-full py-4" style={{ maxWidth: 'calc((100svh - 20rem) * 1.78)' }}>
        {/* Карта медленно «дышит», края растворяются в фоне */}
        <div className="relative animate-[auth-drift_24s_ease-in-out_infinite_alternate] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_78%)] motion-reduce:animate-none">
          <img src={mapImage} alt="" className="w-full select-none" draggable={false} />
          {PORTS.map((port, index) => (
            <span
              key={index}
              aria-hidden
              className="absolute size-2 -translate-1/2 rounded-full bg-cyan-300"
              style={{ left: `${port.x}%`, top: `${port.y}%` }}
            >
              <span
                className="absolute inset-0 animate-ping rounded-full bg-cyan-300 motion-reduce:hidden"
                style={{ animationDelay: `${index * 0.45}s`, animationDuration: '2.4s' }}
              />
            </span>
          ))}
        </div>
        <LiveCard />
      </div>

      <div className="relative text-center">
        <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance xl:text-4xl min-[1700px]:text-5xl">
          {t('The smart workspace for modern forwarding.')}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-base text-pretty text-slate-400 xl:text-lg">
          {t('Track shipments, manage quotations, and analyze revenue in one secure platform.')}
        </p>
      </div>
    </aside>
  )
}

// Маленькая «живая» карточка перевозки поверх карты, меняется каждые 4 секунды
function LiveCard() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % LIVE.length), 4000)
    return () => clearInterval(timer)
  }, [])
  const item = LIVE[index]!

  return (
    <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 shadow-xl backdrop-blur-md">
      <div key={index} className="animate-in fade-in slide-in-from-bottom-1 duration-500">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-emerald-400" />
          </span>
          {t('Live')} · {item.ref} · {t(item.mode)}
        </div>
        <div className="mt-1 text-sm font-medium">{item.route}</div>
        <div className="text-xs text-cyan-300">{t(item.status)}</div>
      </div>
    </div>
  )
}
