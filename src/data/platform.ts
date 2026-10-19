import { useSyncExternalStore } from 'react'

/*
 * Уровень платформы: все компании-клиенты и их лицензии.
 * Это прототип админки владельца платформы. Как и остальное, пока хранится в браузере.
 * На бэкенде это станут таблицы companies / licenses / license_events, а проверка лицензии уйдёт на сервер.
 */

export const PLANS = ['trial', 'start', 'business', 'enterprise'] as const
export type Plan = (typeof PLANS)[number]

// Мест (сотрудников) по тарифу; null — без лимита
export const planSeats: Record<Plan, number | null> = { trial: 3, start: 5, business: 15, enterprise: null }
export const planLabels: Record<Plan, string> = {
  trial: 'Trial',
  start: 'Start',
  business: 'Business',
  enterprise: 'Enterprise',
}

export const TRIAL_DAYS = 14
// За сколько дней до конца показываем предупреждение
export const EXPIRING_DAYS = 7

export type LicenseStatus = 'trial' | 'active' | 'expiring' | 'expired' | 'blocked'

// text — ключ перевода, params подставляются при показе (поэтому история видна на любом языке)
export type LicenseEvent = { id: string; at: string; text: string; params?: Record<string, string | number> }

export type Company = {
  id: string
  name: string
  country: string
  adminName: string
  adminEmail: string
  plan: Plan
  // Конец оплаченного периода, дата YYYY-MM-DD включительно
  paidUntil: string
  blocked: boolean
  // Сколько людей в команде у других компаний (у текущей считаем по настоящей команде)
  users: number
  createdAt: string
  lastActiveAt: string
  note: string
  events: LicenseEvent[]
}

type State = {
  companies: Company[]
  // Компания, чьё рабочее пространство открыто в этом браузере
  currentCompanyId: string
}

const STORAGE_KEY = 'platform'
const DAY = 24 * 60 * 60 * 1000

const isoDate = (date: Date) => date.toISOString().slice(0, 10)
export const addDays = (from: string | Date, days: number) => isoDate(new Date(new Date(from).getTime() + days * DAY))
const todayIso = () => isoDate(new Date())
const newId = () => crypto.randomUUID()

// Сколько дней осталось: 0 — последний день сегодня, отрицательное — уже истекла
export function daysLeft(company: Company, today = todayIso()) {
  return Math.round((new Date(company.paidUntil).getTime() - new Date(today).getTime()) / DAY)
}

export function licenseStatus(company: Company, today = todayIso()): LicenseStatus {
  if (company.blocked) return 'blocked'
  const left = daysLeft(company, today)
  if (left < 0) return 'expired'
  if (company.plan === 'trial') return 'trial'
  return left <= EXPIRING_DAYS ? 'expiring' : 'active'
}

export const seatLimit = (company: Company) => planSeats[company.plan]

// Демо: несколько компаний в разных состояниях, чтобы в админке было на что посмотреть
function seed(): State {
  const t = todayIso()
  const company = (data: Omit<Company, 'id' | 'events' | 'note'> & { id?: string; note?: string }): Company => ({
    id: data.id ?? newId(),
    note: '',
    events: [{ id: newId(), at: data.createdAt, text: 'Company registered' }],
    ...data,
  })
  return {
    currentCompanyId: 'demo',
    companies: [
      company({
        id: 'demo',
        name: 'Logistics',
        country: 'Turkmenistan',
        adminName: 'Manager',
        adminEmail: 'manager@company.com',
        plan: 'business',
        paidUntil: addDays(t, 45),
        blocked: false,
        users: 3,
        createdAt: addDays(t, -320),
        lastActiveAt: t,
        note: 'Demo workspace in this browser',
      }),
      company({
        name: 'Win Fin Logistics',
        country: 'Turkmenistan',
        adminName: 'Merdan A.',
        adminEmail: 'merdan@winfin.tm',
        plan: 'start',
        paidUntil: addDays(t, 5),
        blocked: false,
        users: 4,
        createdAt: addDays(t, -150),
        lastActiveAt: addDays(t, -1),
      }),
      company({
        name: 'Silk Road Cargo',
        country: 'Uzbekistan',
        adminName: 'Aziz K.',
        adminEmail: 'aziz@silkroadcargo.uz',
        plan: 'trial',
        paidUntil: addDays(t, 9),
        blocked: false,
        users: 2,
        createdAt: addDays(t, -5),
        lastActiveAt: t,
      }),
      company({
        name: 'Anatolia Freight',
        country: 'Turkey',
        adminName: 'Emre Y.',
        adminEmail: 'emre@anatoliafreight.com.tr',
        plan: 'business',
        paidUntil: addDays(t, 210),
        blocked: false,
        users: 11,
        createdAt: addDays(t, -400),
        lastActiveAt: addDays(t, -2),
      }),
      company({
        name: 'Caspian Trans',
        country: 'Kazakhstan',
        adminName: 'Daniyar S.',
        adminEmail: 'd.s@caspiantrans.kz',
        plan: 'start',
        paidUntil: addDays(t, -12),
        blocked: false,
        users: 3,
        createdAt: addDays(t, -200),
        lastActiveAt: addDays(t, -13),
      }),
      company({
        name: 'Gulf Line Shipping',
        country: 'United Arab Emirates',
        adminName: 'Omar H.',
        adminEmail: 'omar@gulfline.ae',
        plan: 'enterprise',
        paidUntil: addDays(t, 330),
        blocked: false,
        users: 27,
        createdAt: addDays(t, -90),
        lastActiveAt: t,
      }),
      company({
        name: 'Fast Road TM',
        country: 'Turkmenistan',
        adminName: 'Batyr G.',
        adminEmail: 'batyr@fastroad.tm',
        plan: 'trial',
        paidUntil: addDays(t, -3),
        blocked: true,
        users: 1,
        createdAt: addDays(t, -17),
        lastActiveAt: addDays(t, -4),
        note: 'Spam sign-ups, blocked',
      }),
    ],
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    // мусор в localStorage — начинаем с демо
  }
  return seed()
}

let state = load()
const listeners = new Set<() => void>()

function setState(update: (prev: State) => State) {
  state = update(state)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // не сохранилось — живёт до перезагрузки
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useCompanies = () => useSyncExternalStore(subscribe, () => state.companies)
export const useCurrentCompany = () =>
  useSyncExternalStore(subscribe, () => state.companies.find((c) => c.id === state.currentCompanyId))
export const getCurrentCompany = () => state.companies.find((c) => c.id === state.currentCompanyId)

function updateCompany(id: string, patch: Partial<Company>, eventText?: string, params?: LicenseEvent['params']) {
  setState((s) => ({
    ...s,
    companies: s.companies.map((c) =>
      c.id === id
        ? {
            ...c,
            ...patch,
            events: eventText
              ? [{ id: newId(), at: new Date().toISOString(), text: eventText, params }, ...c.events]
              : c.events,
          }
        : c,
    ),
  }))
}

// Регистрация новой компании: пробный период, она становится текущей в этом браузере
export function registerCompany(data: { name: string; country: string; adminName: string; adminEmail: string }) {
  const now = new Date().toISOString()
  const company: Company = {
    ...data,
    id: newId(),
    plan: 'trial',
    paidUntil: addDays(now, TRIAL_DAYS - 1),
    blocked: false,
    users: 1,
    createdAt: now,
    lastActiveAt: now,
    note: '',
    events: [{ id: newId(), at: now, text: 'Company registered, {n}-day trial started', params: { n: TRIAL_DAYS } }],
  }
  setState((s) => ({ companies: [company, ...s.companies], currentCompanyId: company.id }))
  return company
}

// Продлить: от сегодняшнего дня, если уже истекла, иначе от текущей даты окончания
export function extendLicense(id: string, months: number) {
  const company = state.companies.find((c) => c.id === id)
  if (!company) return
  const from = daysLeft(company) < 0 ? todayIso() : addDays(company.paidUntil, 1)
  const until = new Date(from)
  until.setMonth(until.getMonth() + months)
  const paidUntil = addDays(until, -1)
  updateCompany(
    id,
    { paidUntil, plan: company.plan === 'trial' ? 'start' : company.plan },
    months === 12 ? 'Extended by 1 year until {date}' : 'Extended by 1 month until {date}',
    { date: paidUntil },
  )
}

export function setLicenseUntil(id: string, paidUntil: string) {
  updateCompany(id, { paidUntil }, 'License end date set to {date}', { date: paidUntil })
}

export function changePlan(id: string, plan: Plan) {
  updateCompany(id, { plan }, 'Plan changed to {plan}', { plan: planLabels[plan] })
}

export function setBlocked(id: string, blocked: boolean) {
  updateCompany(id, { blocked }, blocked ? 'Company blocked' : 'Company unblocked')
}

export function setCompanyNote(id: string, note: string) {
  updateCompany(id, { note })
}

// Отмечаем активность текущей компании при входе
export function touchCurrentCompany() {
  updateCompany(state.currentCompanyId, { lastActiveAt: new Date().toISOString() })
}

/* ---------- Вход владельца платформы ---------- */
// Отдельная сессия: владелец платформы не входит в рабочие пространства компаний

const OWNER_KEY = 'platform-session'
let owner: string | null = (() => {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
})()
const ownerListeners = new Set<() => void>()

function saveOwner(email: string | null) {
  owner = email
  try {
    if (email) localStorage.setItem(OWNER_KEY, email)
    else localStorage.removeItem(OWNER_KEY)
  } catch {
    // только до перезагрузки
  }
  ownerListeners.forEach((listener) => listener())
}

export const usePlatformOwner = () =>
  useSyncExternalStore(
    (listener) => {
      ownerListeners.add(listener)
      return () => ownerListeners.delete(listener)
    },
    () => owner,
  )
export const signInOwner = (email: string) => saveOwner(email)
export const signOutOwner = () => saveOwner(null)

// «Сбросить демо-данные» возвращает и демо-компанию
export function switchToDemoCompany() {
  setState((s) => ({ ...s, currentCompanyId: 'demo' }))
}
