import type { Company, LicensePayment } from './platform'
import { addDays, paymentAmount, periodEnd, planSeats, todayIso, TRIAL_DAYS, type Plan } from './plans'

/*
 * Демо-история платформы за год: компании регистрируются, проходят пробный период, платят помесячно или за год,
 * кто-то уходит. Генератор с фиксированным зерном, поэтому цифры одинаковые при каждом сбросе.
 */

// Простой генератор случайных чисел с зерном (mulberry32)
function random(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const COMPANIES: [name: string, country: string, admin: string, domain: string][] = [
  ['Win Fin Logistics', 'Turkmenistan', 'Merdan A.', 'winfin.tm'],
  ['Silk Road Cargo', 'Uzbekistan', 'Aziz K.', 'silkroadcargo.uz'],
  ['Anatolia Freight', 'Turkey', 'Emre Y.', 'anatoliafreight.com.tr'],
  ['Caspian Trans', 'Kazakhstan', 'Daniyar S.', 'caspiantrans.kz'],
  ['Gulf Line Shipping', 'United Arab Emirates', 'Omar H.', 'gulfline.ae'],
  ['Fast Road TM', 'Turkmenistan', 'Batyr G.', 'fastroad.tm'],
  ['Altyn Asyr Logistic', 'Turkmenistan', 'Maral B.', 'altynasyr.tm'],
  ['Samarkand Express', 'Uzbekistan', 'Rustam N.', 'samexpress.uz'],
  ['Almaty Forwarding', 'Kazakhstan', 'Aigerim T.', 'almatyfwd.kz'],
  ['Baku Transit', 'Azerbaijan', 'Elvin M.', 'bakutransit.az'],
  ['Tbilisi Cargo Hub', 'Georgia', 'Giorgi L.', 'tbilisihub.ge'],
  ['Mersin Port Agency', 'Turkey', 'Selin K.', 'mersinport.com.tr'],
  ['Persian Gate Freight', 'Iran', 'Reza F.', 'persiangate.ir'],
  ['Bishkek Movers', 'Kyrgyzstan', 'Nurlan A.', 'bishkekmovers.kg'],
  ['Dushanbe Trans Line', 'Tajikistan', 'Firuz R.', 'dtl.tj'],
  ['Urumqi Silk Freight', 'China', 'Li Wei', 'urumqisilk.cn'],
  ['Dubai Air Forwarders', 'United Arab Emirates', 'Fatima Z.', 'dxbair.ae'],
  ['Mary Agro Logistics', 'Turkmenistan', 'Serdar O.', 'maryagro.tm'],
  ['Istanbul Road Partners', 'Turkey', 'Burak D.', 'irp.com.tr'],
  ['Novorossiysk Sea Agent', 'Russia', 'Igor P.', 'nvrsea.ru'],
  ['Tashkent Rail Cargo', 'Uzbekistan', 'Dilshod U.', 'tashrail.uz'],
  ['Aktau Port Services', 'Kazakhstan', 'Asel B.', 'aktauport.kz'],
  ['Herat Transit Co', 'Afghanistan', 'Ahmad S.', 'herattransit.af'],
  ['Turkmenbashi Shipping', 'Turkmenistan', 'Kerim Ya.', 'tbshipping.tm'],
]

function pickPlan(r: number): Plan {
  if (r < 0.5) return 'start'
  if (r < 0.85) return 'business'
  return 'enterprise'
}

// Оплаченные периоды: от конца пробного до «сегодня» (или до момента ухода)
function payments(id: string, plan: Plan, from: string, months: number, stopAt: string | null, today: string) {
  const list: LicensePayment[] = []
  let start = from
  while (start <= today && (!stopAt || start < stopAt)) {
    list.push({
      id: `${id}-p${list.length}`,
      date: start,
      from: start,
      amount: paymentAmount(plan, months),
      months,
      plan,
    })
    start = addDays(periodEnd(start, months), 1)
  }
  return { list, paidUntil: list.length ? addDays(start, -1) : null }
}

export function seedCompanies(): Company[] {
  const rnd = random(20261019)
  const today = todayIso()
  const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1))

  const make = (
    id: string,
    [name, country, adminName, domain]: (typeof COMPANIES)[number],
    createdAt: string,
    opts: {
      plan?: Plan
      months?: number
      churn?: boolean
      neverPaid?: boolean
      blocked?: boolean
      users?: number
    } = {},
  ): Company => {
    const trialEnd = addDays(createdAt, TRIAL_DAYS - 1)
    const events: Company['events'] = [
      { id: `${id}-e0`, at: createdAt, text: 'Company registered, {n}-day trial started', params: { n: TRIAL_DAYS } },
    ]
    let plan: Plan = 'trial'
    let paidUntil = trialEnd
    let list: LicensePayment[] = []
    if (trialEnd < today && !opts.neverPaid) {
      plan = opts.plan ?? pickPlan(rnd())
      const months = opts.months ?? (rnd() < 0.12 ? 12 : 1)
      // Ушедшие платили от 2 до 5 месяцев
      const stopAt = opts.churn ? addDays(trialEnd, int(60, 150)) : null
      const paid = payments(id, plan, addDays(trialEnd, 1), months, stopAt && stopAt < today ? stopAt : null, today)
      list = paid.list
      paidUntil = paid.paidUntil ?? trialEnd
      for (const p of list)
        events.unshift({
          id: `${p.id}-e`,
          at: p.date,
          text: p.months === 12 ? 'Extended by 1 year until {date}' : 'Extended by 1 month until {date}',
          params: { date: periodEnd(p.date, p.months) },
        })
    }
    const seats = planSeats[plan] ?? 40
    return {
      id,
      name,
      country,
      adminName,
      adminEmail: `${adminName.split(' ')[0]!.toLowerCase()}@${domain}`,
      plan,
      paidUntil,
      blocked: !!opts.blocked,
      users: opts.users ?? Math.max(1, int(Math.ceil(seats / 3), seats)),
      createdAt,
      lastActiveAt: paidUntil < today ? paidUntil : addDays(today, -int(0, 3)),
      note: opts.blocked ? 'Spam sign-ups, blocked' : '',
      events,
      payments: list,
    }
  }

  const companies = COMPANIES.map((data, i) => {
    // Регистрации раскиданы по году и чаще к сегодняшнему дню: платформа растёт
    const ago = Math.round(350 * Math.pow((COMPANIES.length - i) / COMPANIES.length, 1.3)) + int(-6, 6)
    const r = rnd()
    return make(`c${i}`, data, addDays(today, -ago), {
      churn: r < 0.15,
      neverPaid: r > 0.85,
    })
  })
  // Несколько компаний в состояниях, которые точно стоит показать
  companies[0] = make('c0', COMPANIES[0]!, addDays(today, -160), { plan: 'start', months: 1 })
  companies[1] = make('c1', COMPANIES[1]!, addDays(today, -5))
  companies[5] = make('c5', COMPANIES[5]!, addDays(today, -17), { neverPaid: true, blocked: true, users: 1 })
  companies[4] = make('c4', COMPANIES[4]!, addDays(today, -200), { plan: 'enterprise', months: 12, users: 27 })

  // Рабочее пространство этого браузера: демо-компания на Business, платит помесячно
  const demo = make('demo', ['Logistics', 'Turkmenistan', 'Manager', 'company.com'], addDays(today, -320), {
    plan: 'business',
    months: 1,
    users: 3,
  })
  return [{ ...demo, adminEmail: 'manager@company.com', note: 'Demo workspace in this browser' }, ...companies]
}
