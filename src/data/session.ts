import type { Role } from '@/types/team'

/*
 * Кто сейчас вошёл. Отдельный файл, чтобы и вход (auth.ts), и база (store.ts) могли его читать
 * без циклических импортов. Сессия хранится в localStorage, чтобы не входить заново после обновления.
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

export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSession = () => session

export function saveSession(next: Session | null) {
  session = next
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // без localStorage сессия просто живёт до перезагрузки
  }
  listeners.forEach((listener) => listener())
}
