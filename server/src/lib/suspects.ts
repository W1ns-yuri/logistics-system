/*
 * Похоже ли, что компания — это та же компания, что уже брала пробный период.
 * Ничего не блокируем: только помечаем в админке, решает владелец платформы.
 * Совпадения: тот же браузер, тот же IP регистрации, тот же домен почты (кроме бесплатных почт) или ИНН.
 */
import type { companies } from '../db/schema.ts'

type Row = typeof companies.$inferSelect
export type SuspectReason = 'device' | 'ip' | 'email' | 'taxId'
export type Suspect = { id: string; name: string; reasons: SuspectReason[] }

// Бесплатные почты: один домен у миллионов людей, совпадение ничего не значит
const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'mail.ru', 'bk.ru', 'list.ru', 'inbox.ru', 'internet.ru', 'yandex.ru', 'yandex.com',
  'ya.ru', 'rambler.ru', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'icloud.com', 'me.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'gmx.de', 'aol.com', 'zoho.com', 'tut.by', 'ukr.net',
])

function keysOf(row: Row): [SuspectReason, string][] {
  const keys: [SuspectReason, string][] = []
  const signup = row.signup ?? {}
  if (signup.device) keys.push(['device', signup.device])
  // Локальный адрес — это сам сервер или прокси без настройки, по нему не сравниваем
  if (signup.ip && !/^(127\.|::1$|::ffff:127\.)/.test(signup.ip)) keys.push(['ip', signup.ip])
  const domain = signup.emailDomain?.toLowerCase()
  if (domain && !FREE_MAIL.has(domain)) keys.push(['email', domain])
  const taxId = String(row.settings?.companyTaxId ?? '').replace(/\s+/g, '').toLowerCase()
  if (taxId.length >= 5) keys.push(['taxId', taxId])
  return keys
}

export function findSuspects(rows: Row[]) {
  // Ключ → компании с ним
  const index = new Map<string, Row[]>()
  for (const row of rows)
    for (const [reason, value] of keysOf(row)) {
      const key = `${reason}:${value}`
      index.set(key, [...(index.get(key) ?? []), row])
    }
  const result = new Map<string, Suspect[]>()
  for (const row of rows) {
    const found = new Map<string, Suspect>()
    for (const [reason, value] of keysOf(row))
      for (const other of index.get(`${reason}:${value}`) ?? []) {
        if (other.id === row.id) continue
        const suspect = found.get(other.id) ?? { id: other.id, name: other.name, reasons: [] }
        suspect.reasons.push(reason)
        found.set(other.id, suspect)
      }
    if (found.size) result.set(row.id, [...found.values()])
  }
  return result
}
