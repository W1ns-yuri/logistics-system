import { useSyncExternalStore } from 'react'

/*
 * Демо-вход: принимает любой email и пароль.
 * Сессия хранится в localStorage, чтобы не входить заново после обновления страницы.
 * Когда будет бэкенд, здесь появится настоящий запрос к API и токен.
 */

const STORAGE_KEY = 'session'

export type Session = { email: string; signedInAt: string }

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
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
  save({ email, signedInAt: new Date().toISOString() })
}

export function signOut() {
  save(null)
}
