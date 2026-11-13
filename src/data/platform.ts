import { useSyncExternalStore } from 'react'

/*
 * Уровень платформы: все компании-клиенты и их лицензии.
 * Это прототип админки владельца платформы. Как и остальное, пока хранится в браузере.
 * На бэкенде это станут таблицы companies / licenses / license_events, а проверка лицензии уйдёт на сервер.
 */

import { api, API_MODE } from '@/lib/api'
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
  upgradePlan,
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
  // Места сверх тарифа (команда больше 10 человек) — ставит владелец платформы
  extraSeats?: number
  // Компания нажала «Хочу оплатить»: владелец видит заявку и связывается с ней
  planRequest?: PlanRequest
}

export type PlanRequest = { plan: Plan; months: number; at: string }

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

// v2: у компаний появились оплаты лицензий. v3: демо-компания на Standard, чтобы в демо была видна аналитика
const STORAGE_KEY = 'platform-v3'
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

export const seatLimit = (company: Company) => {
  const base = planSeats[company.plan]
  return base === null ? null : base + (company.extraSeats ?? 0)
}

function seed(): State {
  return { currentCompanyId: 'demo', companies: seedCompanies() }
}

// Переименовали тарифы (Start/Business/Enterprise → Lite/Lite+/Standard) — чиним сохранённое
function upgradeState(saved: State): State {
  return {
    ...saved,
    companies: saved.companies.map((c) => ({
      ...c,
      plan: upgradePlan(c.plan),
      payments: c.payments.map((p) => ({ ...p, plan: upgradePlan(p.plan) })),
      profile: c.profile && {
        ...c.profile,
        plannedPlan: c.profile.plannedPlan && upgradePlan(c.profile.plannedPlan),
      },
    })),
  }
}

function load(): State {
  // Рабочая сборка: компании приходят с сервера
  if (API_MODE) return { companies: [], currentCompanyId: '' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return upgradeState(JSON.parse(raw) as State)
  } catch {
    // мусор в localStorage — начинаем с демо
  }
  return seed()
}

let state = load()
const listeners = new Set<() => void>()

function setState(update: (prev: State) => State) {
  state = update(state)
  if (API_MODE) return listeners.forEach((listener) => listener())
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

// Рабочая сборка: компания, в которой работает вошедший человек (приходит с сервера)
export function setWorkspaceCompany(company: Company | undefined) {
  setState((s) => ({
    companies: company ? [company, ...s.companies.filter((c) => c.id !== company.id)] : s.companies,
    currentCompanyId: company?.id ?? '',
  }))
}

type Action =
  | { type: 'extend'; months: number; amount?: number; plan?: Plan }
  | { type: 'remove_payment'; paymentId: string }
  | { type: 'set_until'; date: string }
  | { type: 'adjust_days'; days: number }
  | { type: 'seats'; extra: number }
  | { type: 'dismiss_request' }
  | { type: 'plan'; plan: Plan }
  | { type: 'block'; blocked: boolean }
  | { type: 'note'; note: string }

// Рабочая сборка: действие владельца платформы выполняет сервер, в ответ — обновлённая компания
async function remoteAction(id: string, action: Action) {
  const { company } = await api<{ company: Company }>(`/api/platform/companies/${id}/actions`, { body: action })
  setState((s) => ({ ...s, companies: s.companies.map((c) => (c.id === id ? company : c)) }))
}

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
  company.plan === 'trial' ? (company.profile?.plannedPlan ?? 'lite') : company.plan

// Принять оплату. amount и plan можно поменять, если договорились о другой цене или тарифе
export async function extendLicense(id: string, months: number, deal: { amount?: number; plan?: Plan } = {}) {
  if (API_MODE) return remoteAction(id, { type: 'extend', months, ...deal })
  const company = state.companies.find((c) => c.id === id)
  if (!company) return
  const plan = deal.plan ?? renewalPlan(company)
  const from = daysLeft(company) < 0 ? todayIso() : addDays(company.paidUntil, 1)
  const paidUntil = periodEnd(from, months)
  const payment: LicensePayment = {
    id: newId(),
    date: todayIso(),
    from,
    amount: deal.amount ?? paymentAmount(plan, months),
    months,
    plan,
  }
  updateCompany(
    id,
    { paidUntil, plan, payments: [...company.payments, payment], planRequest: undefined },
    'Extended by {n} mo. until {date}',
    { n: months, date: paidUntil },
  )
}

// Добавить (+) или списать (−) дни лицензии: подарок, компенсация, ошибка
export async function adjustLicenseDays(id: string, days: number) {
  if (API_MODE) return remoteAction(id, { type: 'adjust_days', days })
  const company = state.companies.find((c) => c.id === id)
  if (!company || !days) return
  const paidUntil = addDays(company.paidUntil, days)
  updateCompany(id, { paidUntil }, days > 0 ? '{n} days added, license until {date}' : '{n} days removed, license until {date}', {
    n: Math.abs(days),
    date: paidUntil,
  })
}

export async function setExtraSeats(id: string, extra: number) {
  if (API_MODE) return remoteAction(id, { type: 'seats', extra })
  updateCompany(id, { extraSeats: extra }, 'Extra users: {n}', { n: extra })
}

export async function dismissPlanRequest(id: string) {
  if (API_MODE) return remoteAction(id, { type: 'dismiss_request' })
  updateCompany(id, { planRequest: undefined }, 'Payment request closed')
}

// Сторона компании: «Хочу оплатить» — тариф и срок. Владелец платформы увидит заявку в админке
export async function requestPlan(plan: Plan, months: number) {
  if (API_MODE) {
    const { company } = await api<{ company: Company }>('/api/company/plan-request', { body: { plan, months } })
    setWorkspaceCompany(company)
    return
  }
  const company = getCurrentCompany()
  if (!company) return
  updateCompany(company.id, { planRequest: { plan, months, at: new Date().toISOString() } }, 'Payment requested: {plan}, {n} mo.', {
    plan: planLabels[plan],
    n: months,
  })
}

// Админ компании забыл пароль: ссылка, по которой он задаст новый (только рабочая сборка)
export async function issueAdminLink(id: string) {
  const res = await api<{ link: string; email: string; company: Company }>(`/api/platform/companies/${id}/access-link`, {
    method: 'POST',
    body: {},
  })
  setState((s) => ({ ...s, companies: s.companies.map((c) => (c.id === id ? res.company : c)) }))
  return { url: window.location.origin + res.link, email: res.email }
}

// Убрать оплату, внесённую по ошибке. Последняя оплата откатывает и срок лицензии
export async function removeLicensePayment(id: string, paymentId: string) {
  if (API_MODE) return remoteAction(id, { type: 'remove_payment', paymentId })
  const company = state.companies.find((c) => c.id === id)
  const payment = company?.payments.find((p) => p.id === paymentId)
  if (!company || !payment) return
  const rollBack = company.payments.at(-1)?.id === paymentId && company.paidUntil === periodEnd(payment.from, payment.months)
  const paidUntil = rollBack ? addDays(payment.from, -1) : company.paidUntil
  updateCompany(
    id,
    { paidUntil, payments: company.payments.filter((p) => p.id !== paymentId) },
    rollBack ? 'Payment of {amount} removed, license until {date}' : 'Payment of {amount} removed',
    { amount: `$${payment.amount}`, date: paidUntil },
  )
}

export async function setLicenseUntil(id: string, paidUntil: string) {
  if (API_MODE) return remoteAction(id, { type: 'set_until', date: paidUntil })
  updateCompany(id, { paidUntil }, 'License end date set to {date}', { date: paidUntil })
}

export async function changePlan(id: string, plan: Plan) {
  if (API_MODE) return remoteAction(id, { type: 'plan', plan })
  updateCompany(id, { plan }, 'Plan changed to {plan}', { plan: planLabels[plan] })
}

export async function setBlocked(id: string, blocked: boolean) {
  if (API_MODE) return remoteAction(id, { type: 'block', blocked })
  updateCompany(id, { blocked }, blocked ? 'Company blocked' : 'Company unblocked')
}

export async function setCompanyNote(id: string, note: string) {
  if (API_MODE) return remoteAction(id, { type: 'note', note })
  updateCompany(id, { note })
}

// Отмечаем активность текущей компании при входе
export function touchCurrentCompany() {
  if (API_MODE) return // сервер сам отмечает вход
  updateCompany(state.currentCompanyId, { lastActiveAt: new Date().toISOString() })
}

/* ---------- Вход владельца платформы ---------- */
// Отдельная сессия: владелец платформы не входит в рабочие пространства компаний

const OWNER_KEY = 'platform-session'
let owner: string | null = (() => {
  if (API_MODE) return null
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
})()
const ownerListeners = new Set<() => void>()

function saveOwner(email: string | null) {
  owner = email
  if (API_MODE) return ownerListeners.forEach((listener) => listener())
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
// Рабочая сборка: настоящий вход владельца, со своим паролем
export async function signInOwner(email: string, password = '') {
  if (!API_MODE) return saveOwner(email)
  const res = await api<{ email: string }>('/api/platform/login', { body: { email, password } })
  await loadPlatformCompanies()
  saveOwner(res.email)
}

export async function signOutOwner() {
  if (API_MODE) await api('/api/platform/logout', { method: 'POST', body: {} }).catch(() => undefined)
  saveOwner(null)
}

export async function loadPlatformCompanies() {
  const { companies } = await api<{ companies: Company[] }>('/api/platform/companies')
  setState((s) => ({ ...s, companies }))
}

// При открытии админки: может, владелец уже вошёл (cookie жива)
let ownerChecked = false
export async function restoreOwnerSession() {
  if (!API_MODE || ownerChecked) return
  ownerChecked = true
  try {
    const me = await api<{ email: string }>('/api/platform/me')
    await loadPlatformCompanies()
    saveOwner(me.email)
  } catch {
    // не вошёл — покажем форму входа
  }
}

// «Сбросить демо-данные» возвращает и демо-компанию
export function switchToDemoCompany() {
  setState((s) => ({ ...s, currentCompanyId: 'demo' }))
}
