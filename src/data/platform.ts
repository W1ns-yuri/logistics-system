import { useSyncExternalStore } from 'react'

/*
 * Уровень платформы: все компании-клиенты и их лицензии.
 * Это прототип админки владельца платформы. Как и остальное, пока хранится в браузере.
 * На бэкенде это станут таблицы companies / licenses / license_events, а проверка лицензии уйдёт на сервер.
 */

import type { TransportMode } from '@/types/logistics'
import { seedCompanies } from './platform-seed'
import {
  addDays,
  daysBetween,
  paymentAmount,
  periodEnd,
  planLabels,
  planSeats,
  todayIso,
  TRIAL_DAYS,
  type Plan,
} from './plans'

export * from './plans'

// За сколько дней до конца показываем предупреждение
export const EXPIRING_DAYS = 7

export type LicenseStatus = 'trial' | 'active' | 'expiring' | 'expired' | 'blocked'

// text — ключ перевода, params подставляются при показе (поэтому история видна на любом языке)
export type LicenseEvent = { id: string; at: string; text: string; params?: Record<string, string | number> }

// Оплата лицензии: за сколько месяцев и по какому тарифу
// date — когда заплатили, from — с какого дня действует оплаченный период
export type LicensePayment = { id: string; date: string; from: string; amount: number; months: number; plan: Plan }

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
  payments: LicensePayment[]
  // Что компания рассказала о себе при регистрации (у демо-компаний может не быть)
  profile?: CompanyProfile
}

export const TEAM_SIZES = ['1-3', '4-10', '11-30', '30+'] as const
export type TeamSize = (typeof TEAM_SIZES)[number]

export type CompanyProfile = {
  city: string
  phone: string
  website?: string
  teamSize: TeamSize
  modes: TransportMode[]
  // Какой тариф выбрали на после пробного периода; undefined — решат потом
  plannedPlan?: Plan
}

type State = {
  companies: Company[]
  // Компания, чьё рабочее пространство открыто в этом браузере
  currentCompanyId: string
}

// v2: у компаний появились оплаты лицензий
const STORAGE_KEY = 'platform-v2'
const newId = () => crypto.randomUUID()

// Сколько дней осталось: 0 — последний день сегодня, отрицательное — уже истекла
export function daysLeft(company: Company, today = todayIso()) {
  return daysBetween(today, company.paidUntil)
}

export function licenseStatus(company: Company, today = todayIso()): LicenseStatus {
  if (company.blocked) return 'blocked'
  const left = daysLeft(company, today)
  if (left < 0) return 'expired'
  if (company.plan === 'trial') return 'trial'
  return left <= EXPIRING_DAYS ? 'expiring' : 'active'
}

export const seatLimit = (company: Company) => planSeats[company.plan]

function seed(): State {
  return { currentCompanyId: 'demo', companies: seedCompanies() }
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
export function registerCompany(data: {
  name: string
  country: string
  adminName: string
  adminEmail: string
  profile: CompanyProfile
}) {
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
    payments: [],
  }
  setState((s) => ({ companies: [company, ...s.companies], currentCompanyId: company.id }))
  return company
}

// Продлить = принять оплату: от сегодняшнего дня, если уже истекла, иначе от текущей даты окончания.
// Пробный период при продлении становится тарифом, выбранным при регистрации (или Start)
export const renewalPlan = (company: Company): Plan =>
  company.plan === 'trial' ? (company.profile?.plannedPlan ?? 'start') : company.plan

export function extendLicense(id: string, months: number) {
  const company = state.companies.find((c) => c.id === id)
  if (!company) return
  const plan = renewalPlan(company)
  const from = daysLeft(company) < 0 ? todayIso() : addDays(company.paidUntil, 1)
  const paidUntil = periodEnd(from, months)
  const payment: LicensePayment = {
    id: newId(),
    date: todayIso(),
    from,
    amount: paymentAmount(plan, months),
    months,
    plan,
  }
  updateCompany(
    id,
    { paidUntil, plan, payments: [...company.payments, payment] },
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
