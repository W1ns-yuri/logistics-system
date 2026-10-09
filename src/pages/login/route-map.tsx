// Анимированная схема маршрутов: все линии сходятся в хаб Ashgabat.
// Чистый SVG: точки бегут по кривым через <animateMotion>, никаких библиотек.

type City = { code: string; name: string; x: number; y: number }

const HUB: City = { code: 'ASB', name: 'Ashgabat', x: 318, y: 168 }

const CITIES: City[] = [
  { code: 'LHR', name: 'London', x: 70, y: 78 },
  { code: 'IST', name: 'Istanbul', x: 182, y: 118 },
  { code: 'TUN', name: 'Tunis', x: 112, y: 182 },
  { code: 'DXB', name: 'Dubai', x: 262, y: 262 },
  { code: 'XIY', name: 'Xi’an', x: 462, y: 150 },
  { code: 'PVG', name: 'Shanghai', x: 526, y: 196 },
  { code: 'PUS', name: 'Busan', x: 560, y: 132 },
  { code: 'KUL', name: 'Kuala Lumpur', x: 470, y: 318 },
]

// Изогнутая линия от города к хабу: контрольная точка поднята над серединой
function curve(from: City) {
  const mx = (from.x + HUB.x) / 2
  const my = (from.y + HUB.y) / 2 - Math.abs(from.x - HUB.x) * 0.28 - 18
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${HUB.x} ${HUB.y}`
}

export function RouteMap() {
  return (
    <svg viewBox="0 0 620 380" className="h-auto w-full" role="img" aria-label="Shipping routes converging on Ashgabat">
      <defs>
        <radialGradient id="hub-glow">
          <stop offset="0%" stopColor="var(--sidebar-primary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--sidebar-primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="route-line" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--sidebar-primary)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--sidebar-primary)" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {CITIES.map((city, index) => {
        const d = curve(city)
        const duration = 3.2 + (index % 4) * 0.6
        return (
          <g key={city.code}>
            <path d={d} fill="none" stroke="url(#route-line)" strokeWidth="1.25" />
            <path
              d={d}
              fill="none"
              stroke="var(--sidebar-primary)"
              strokeWidth="1.5"
              strokeDasharray="2 10"
              strokeLinecap="round"
              opacity="0.5"
            >
              <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.6s" repeatCount="indefinite" />
            </path>
            {/* «Груз», бегущий к хабу */}
            <circle r="2.6" fill="#fff">
              <animateMotion dur={`${duration}s`} begin={`-${index * 0.45}s`} repeatCount="indefinite" path={d} />
            </circle>
            <circle
              cx={city.x}
              cy={city.y}
              r="3.5"
              fill="var(--sidebar)"
              stroke="var(--sidebar-primary)"
              strokeWidth="1.5"
            />
            <text
              x={city.x}
              y={city.y + 16}
              textAnchor="middle"
              className="fill-sidebar-foreground/70 font-mono text-[10px] tracking-wider"
            >
              {city.code}
            </text>
          </g>
        )
      })}

      {/* Хаб с «пульсом» */}
      <circle cx={HUB.x} cy={HUB.y} r="34" fill="url(#hub-glow)" />
      <circle cx={HUB.x} cy={HUB.y} r="7" fill="none" stroke="var(--sidebar-primary)" strokeWidth="1.5">
        <animate attributeName="r" values="7;22" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx={HUB.x} cy={HUB.y} r="6" fill="var(--sidebar-primary)" />
      <text
        x={HUB.x}
        y={HUB.y - 16}
        textAnchor="middle"
        className="fill-sidebar-accent-foreground font-mono text-[11px] font-semibold tracking-wider"
      >
        {HUB.code}
      </text>
    </svg>
  )
}
