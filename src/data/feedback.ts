import { useSyncExternalStore } from 'react'

import { api, API_MODE } from '@/lib/api'
import { getSession } from './session'
import { getCurrentCompany } from './platform'

/*
 * «Предложить улучшение»: сотрудник компании пишет, чего не хватает или что мешает.
 * Владелец платформы видит всё на странице Feedback в админке.
 * В демо хранится в браузере, в рабочей сборке — на сервере.
 */
export type Feedback = {
  id: string
  companyId: string
  companyName: string
  userName: string
  userEmail: string
  text: string
  page: string
  createdAt: string
}

const STORAGE_KEY = 'feedback-v1'
let items: Feedback[] = (() => {
  if (API_MODE) return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Feedback[]
  } catch {
    return []
  }
})()
const listeners = new Set<() => void>()
function setItems(next: Feedback[]) {
  items = next
  if (!API_MODE)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // не сохранилось — живёт до перезагрузки
    }
  listeners.forEach((listener) => listener())
}

export const useFeedback = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => items,
  )

export async function sendFeedback(text: string, page: string) {
  if (API_MODE) return void (await api('/api/feedback', { body: { text, page } }))
  const session = getSession()
  const company = getCurrentCompany()
  setItems([
    {
      id: crypto.randomUUID(),
      companyId: company?.id ?? '',
      companyName: company?.name ?? '',
      userName: session?.name ?? '',
      userEmail: session?.email ?? '',
      text,
      page,
      createdAt: new Date().toISOString(),
    },
    ...items,
  ])
}

// Админка: загрузить с сервера (в демо всё уже в браузере)
export async function loadFeedback() {
  if (!API_MODE) return
  const res = await api<{ feedback: Feedback[] }>('/api/platform/feedback')
  setItems(res.feedback)
}
