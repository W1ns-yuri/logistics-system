import { useSyncExternalStore } from 'react'

import type { Settings } from './settings'

export type NotificationKind = 'status' | 'quotation' | 'border'

export type AppNotification = {
  id: string
  kind: NotificationKind
  title: string
  description: string
  at: string // ISO
  link: string
}

// Мок-уведомления. Когда появится бэкенд, они будут приходить с сервера.
const mockNotifications: AppNotification[] = [
  {
    id: 'n1',
    kind: 'border',
    title: 'SH000006 on Turkmenistan border',
    description: 'Customs clearance at Serhetabat',
    at: '2026-10-08T15:30',
    link: '/shipments/s6',
  },
  {
    id: 'n2',
    kind: 'border',
    title: 'SH000004 queue at border',
    description: 'Queue at Sarakhs, about 2 days',
    at: '2026-10-06T12:00',
    link: '/shipments/s4',
  },
  {
    id: 'n3',
    kind: 'status',
    title: 'SH000007 delivered',
    description: 'Express Air Cargo · Dubai → Tunis',
    at: '2026-10-08T19:40',
    link: '/shipments/s7',
  },
  {
    id: 'n4',
    kind: 'quotation',
    title: 'New request from Bright Star Cargo',
    description: 'Rail · Xi’an → Ashgabat · 3 × 40 HQ',
    at: '2026-10-08T09:10',
    link: '/quotations/q10',
  },
  {
    id: 'n5',
    kind: 'status',
    title: 'SH000003 loaded at port',
    description: 'DHL · Ashgabat → Abu Dhabi',
    at: '2026-10-04T14:20',
    link: '/shipments/s3',
  },
]

const kindSetting: Record<NotificationKind, keyof Settings> = {
  status: 'notifyStatusChanges',
  quotation: 'notifyNewQuotations',
  border: 'notifyBorderDelays',
}

let readIds = new Set<string>(['n5'])
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  listeners.forEach((listener) => listener())
}

export function useReadIds() {
  return useSyncExternalStore(subscribe, () => readIds)
}

// Показываем только те типы, которые включены в настройках
export function visibleNotifications(settings: Settings) {
  return mockNotifications.filter((n) => settings[kindSetting[n.kind]]).sort((a, b) => b.at.localeCompare(a.at))
}

export function markRead(id: string) {
  readIds = new Set(readIds).add(id)
  emit()
}

export function markAllRead() {
  readIds = new Set(mockNotifications.map((n) => n.id))
  emit()
}
