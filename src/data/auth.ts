import { useSyncExternalStore } from 'react'

import type { Role } from '@/types/team'
import { findMemberByEmail } from './store'

/*
 * Демо-вход: принимает любой email и пароль.
 * Если email есть в команде (Settings → Team), берём имя и роль оттуда, иначе входим как админ.
 * Сессия хранится в localStorage, чтобы не входить заново после обновления страницы.
 * Когда будет бэкенд, здесь появится настоящий запрос к API и токен.
 */

const STORAGE_KEY = 'session'

export type Session = { email: string; name: string; role: Role; signedInAt: string }

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Session>) : null
    // Старые сессии без роли считаем админскими
    return parsed?.email ? ({ name: parsed.email, role: 'admin', signedInAt: '', ...parsed } as Session) : null
  } catch {
    return null
  }
}

let session = load()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function save(next: Session | null) {
  session = next
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // без localStorage сессия просто живёт до перезагрузки
  }
  listeners.forEach((listener) => listener())
}

export function useSession() {
  return useSyncExternalStore(subscribe, () => session)
}

export function signIn(email: string) {
  const member = findMemberByEmail(email)
  save({
    email,
    name: member?.name ?? email.split('@')[0],
    role: member?.role ?? 'admin',
    signedInAt: new Date().toISOString(),
  })
}

// Для демо: посмотреть систему глазами другой роли
export function switchRole(role: Role) {
  if (session) save({ ...session, role })
}

export function signOut() {
  save(null)
}

// Что разрешено текущей роли. Одно место, чтобы не разбрасывать проверки по страницам.
export function usePermissions() {
  const role = useSession()?.role ?? 'employee'
  return {
    role,
    canSeePayments: role !== 'employee',
    canEditOrders: role !== 'accountant',
    canEditPayments: role !== 'employee',
    canManageTeam: role === 'admin',
  }
}
