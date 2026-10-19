import { useSyncExternalStore } from 'react'

import { licenseStatus, touchCurrentCompany, useCurrentCompany } from './platform'
import { getSession, saveSession, subscribeSession } from './session'
import { findMemberByEmail } from './store'

export type { Session } from './session'

/*
 * Демо-вход: принимает любой email и пароль.
 * Если email есть в команде (Settings → Team), берём имя и роль оттуда, иначе входим как админ.
 * Когда будет бэкенд, здесь появится настоящий запрос к API и токен.
 */

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession)
}

export function signIn(email: string) {
  const member = findMemberByEmail(email)
  saveSession({
    email,
    name: member?.name ?? email.split('@')[0],
    role: member?.role ?? 'admin',
    signedInAt: new Date().toISOString(),
  })
  touchCurrentCompany()
}

export function signOut() {
  saveSession(null)
}

// Что разрешено текущей роли. Одно место, чтобы не разбрасывать проверки по страницам.
export function usePermissions() {
  const role = useSession()?.role ?? 'employee'
  const company = useCurrentCompany()
  // Лицензия истекла — только просмотр: данные видны, менять ничего нельзя
  const readOnly = !!company && licenseStatus(company) === 'expired'
  return {
    role,
    readOnly,
    canSeePayments: role !== 'employee',
    canEditOrders: !readOnly && role !== 'accountant',
    // Внести оплату и приложить чек: админ и бухгалтер
    canEditPayments: !readOnly && role !== 'employee',
    // Создать, изменить, удалить инвойс или оплату: только админ (менеджер)
    canEditInvoices: !readOnly && role === 'admin',
    canManageTeam: !readOnly && role === 'admin',
  }
}

/*
 * Котировку или перевозку меняет только тот, кто её создал. Остальные её видят, но не трогают.
 * Админ (менеджер) может всё: если сотрудник ушёл или заболел, его заказы не должны зависнуть.
 * Записи без автора (старые) может менять любой, у кого есть право менять заказы.
 */
export function useCanModify(record?: { createdBy?: string }) {
  const session = useSession()
  const { canEditOrders, role } = usePermissions()
  if (!record || !canEditOrders) return false
  if (role === 'admin' || !record.createdBy) return true
  return record.createdBy.toLowerCase() === session?.email.toLowerCase()
}
