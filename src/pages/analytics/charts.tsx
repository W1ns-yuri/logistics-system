import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/*
 * Лёгкие графики на чистом SVG — без библиотек.
 * Размер берём из контейнера, чтобы текст не растягивался.
 */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width))
    observer.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

// «Красивые» деления оси: 0, 20k, 40k...
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}

function Tooltip({ x, y, children, width }: { x: number; y: number; children: ReactNode; width: number }) {
  // Не даём подсказке вылезти за край
  const left = Math.min(Math.max(x, 80), width - 80)
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg"
      style={{ left, top: y - 24 }}
    >
      {children}
    </div>
  )
}

export type BarLinePoint = { label: string; bar: number; line: number; partial?: boolean }

// Столбик = выручка, зелёная часть внутри = прибыль. Текущий (неполный) месяц светлее.
export function RevenueChart({
  data,
  height = 280,
  format,
  barLabel,
  lineLabel,
  partialLabel,
}: {
  data: BarLinePoint[]
  height?: number
  format: (value: number) => string
  barLabel: string
  lineLabel: string
  partialLabel?: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number>()
  const pad = { top: 26, right: 8, bottom: 28, left: 52 }
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const ticks = niceTicks(Math.max(...data.map((d) => Math.max(d.bar, d.line)), 0))
  const max = ticks.at(-1) || 1
  const band = data.length ? innerW / data.length : 0
  const barW = Math.min(44, band * 0.56)
  const y = (v: number) => pad.top + innerH - (v / max) * innerH
  const cx = (i: number) => pad.left + band * i + band / 2

  return (
    <div ref={ref} className="relative" style={{ height }} onMouseLeave={() => setHover(undefined)}>
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id="bar-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.55" />
            </linearGradient>
            <pattern id="partial-fill" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--chart-1)" opacity="0.25" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--chart-1)" strokeWidth="2.5" opacity="0.6" />
            </pattern>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeDasharray={tick ? '3 4' : undefined}
              />
              <text
                x={pad.left - 10}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {format(tick)}
              </text>
            </g>
          ))}

          {data.map((d, i) => (
            <g key={d.label}>
              {hover === i && (
                <rect
                  x={pad.left + band * i}
                  y={pad.top}
                  width={band}
                  height={innerH}
                  className="fill-muted/60"
                  rx={6}
                />
              )}
              <rect
                x={cx(i) - barW / 2}
                y={y(d.bar)}
                width={barW}
                height={Math.max(0, y(0) - y(d.bar))}
                rx={5}
                fill={d.partial ? 'url(#partial-fill)' : 'url(#bar-fill)'}
                className="transition-[y,height] duration-500"
              />
              <rect
                x={cx(i) - barW / 2}
                y={y(d.line)}
                width={barW}
                height={Math.max(0, y(0) - y(d.line))}
                rx={4}
                fill="var(--chart-2)"
                opacity={d.partial ? 0.6 : 1}
              />
              {d.bar > 0 && (
                <text
                  x={cx(i)}
                  y={y(d.bar) - 7}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-medium"
                >
                  {format(d.bar)}
                </text>
              )}
              <text x={cx(i)} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {d.label}
              </text>
            </g>
          ))}

          {/* Невидимые зоны наведения на весь месяц */}
          {data.map((d, i) => (
            <rect
              key={d.label}
              x={pad.left + band * i}
              y={pad.top}
              width={band}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      )}
      {hover !== undefined && data[hover] && (
        <Tooltip x={cx(hover)} y={y(Math.max(data[hover].bar, data[hover].line))} width={width}>
          <div className="mb-1 font-medium">
            {data[hover].label}
            {data[hover].partial && <span className="font-normal text-muted-foreground"> · {partialLabel}</span>}
          </div>
          <LegendRow color="var(--chart-1)" label={barLabel} value={format(data[hover].bar)} />
          <LegendRow color="var(--chart-2)" label={lineLabel} value={format(data[hover].line)} />
        </Tooltip>
      )}
    </div>
  )
}

export function LegendRow({ color, label, value }: { color: string; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      {value && <span className="ml-auto pl-3 font-medium tabular-nums">{value}</span>}
    </div>
  )
}

// Мини-график в карточке KPI
export function Sparkline({
  values,
  color = 'var(--chart-1)',
  className,
}: {
  values: number[]
  color?: string
  className?: string
}) {
  const w = 120
  const h = 36
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const step = values.length > 1 ? w / (values.length - 1) : 0
  const pts = values.map((v, i) => [i * step, h - 3 - ((v - min) / (max - min || 1)) * (h - 6)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
  const id = `spark-${color.replace(/\W/g, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-9 w-28', className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {pts.length > 1 && <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export type DonutSegment = { key: string; label: string; value: number; color: string }

// Кольцевая диаграмма с числом в центре
export function Donut({
  segments,
  centerLabel,
  size = 168,
}: {
  segments: DonutSegment[]
  centerLabel: string
  size?: number
}) {
  const [hover, setHover] = useState<string>()
  const total = segments.reduce((acc, s) => acc + s.value, 0)
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gap = total ? 3 : 0
  const active = segments.find((s) => s.key === hover)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {segments.map((s, i) => {
          const len = total ? (s.value / total) * c : 0
          const dash = Math.max(0, len - gap)
          // Начало сегмента = сумма длин всех предыдущих
          const offset = segments.slice(0, i).reduce((acc, prev) => acc + (total ? (prev.value / total) * c : 0), 0)
          return (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === s.key ? stroke + 4 : stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className="cursor-pointer transition-[stroke-width] duration-200"
              opacity={hover && hover !== s.key ? 0.35 : 1}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(undefined)}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-semibold tabular-nums">{active ? active.value : total}</div>
        <div className="max-w-24 text-xs text-muted-foreground">{active ? active.label : centerLabel}</div>
      </div>
    </div>
  )
}

// Горизонтальные полоски: топ клиентов, вендоров
export function BarList({
  rows,
  format,
  color = 'var(--chart-1)',
}: {
  rows: { key: string; label: ReactNode; value: number; hint?: string }[]
  format: (value: number) => string
  color?: string
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums">
              {format(row.value)}
              {row.hint && <span className="ml-1.5 text-xs text-muted-foreground">{row.hint}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-700 group-hover:brightness-110"
              style={{ width: `${(row.value / max) * 100}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
