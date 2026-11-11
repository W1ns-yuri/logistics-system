/*
 * Рабочая сборка: синхронизация данных с сервером.
 *
 * Как это устроено (чтобы не переписывать все страницы):
 * 1. При входе загружаем все данные компании с сервера в тот же store, с которым работают страницы.
 * 2. Страницы меняют store как раньше (createQuotation, addPayment…). Мы сравниваем «было/стало»
 *    и отправляем на сервер только изменившиеся записи. Человек видит изменение сразу, не дожидаясь сервера.
 * 3. Файлы (чеки, документы, логотип) перед отправкой загружаем отдельно, в записи остаётся только ссылка.
 * 4. Каждые 15 секунд и при возврате на вкладку забираем изменения коллег.
 * 5. Если сервер отказал (нет прав, лицензия истекла), показываем ошибку и возвращаем данные с сервера.
 */
import { useSyncExternalStore } from 'react'

import { api, ApiError, apiErrorText, uploadDataUrl } from '@/lib/api'
import type { TeamMember } from '@/types/team'
import { setWorkspaceCompany, type Company } from './platform'
import { getSession, saveSession, type Session } from './session'
import { applyServerSettings, onCompanySettingsChange, type Settings } from './settings'
import { applyServerState, emptyState, getState, onLocalChange, withFreshStatuses, type State } from './store'

const COLLECTIONS = ['quotations', 'shipments', 'customers', 'vendors', 'invoices', 'cities'] as const
type Collection = (typeof COLLECTIONS)[number]
type AnyRecord = Record<string, unknown>

type Viewer = { user: { id: string; email: string; name: string }; role: Session['role']; company: Company }
type SyncResponse = {
  serverTime: string
  full: boolean
  viewer: { email: string; name: string; role: Session['role'] }
  company: Company
  settings: Partial<Settings>
  team: TeamMember[]
  records: { collection: Collection; id: string; data: AnyRecord | null }[]
}

const POLL_MS = 15_000
// Запас при опросе: изменение, которое сохранялось в момент прошлого опроса, не потеряется
const OVERLAP_MS = 10_000

/* ---------- Состояние синхронизации (для плашки «Сохраняем…» / ошибки) ---------- */

type Status = { ready: boolean; pending: number; error?: string; offline: boolean }
let status: Status = { ready: false, pending: 0, offline: false }
const statusListeners = new Set<() => void>()
function setStatus(patch: Partial<Status>) {
  status = { ...status, ...patch }
  statusListeners.forEach((listener) => listener())
}
export const useSyncStatus = () =>
  useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener)
      return () => statusListeners.delete(listener)
    },
    () => status,
  )
export const dismissSyncError = () => setStatus({ error: undefined })

/* ---------- Записи ---------- */

// У городов нет id — ключом служит название
const keyOf = (collection: Collection, record: AnyRecord) =>
  collection === 'cities' ? String(record.name).toLowerCase() : String(record.id)

const findRecord = (s: State, collection: Collection, id: string) =>
  (s[collection] as unknown as AnyRecord[]).find((r) => keyOf(collection, r) === id)

function replaceRecord(s: State, collection: Collection, id: string, data: AnyRecord | null): State {
  const list = s[collection] as unknown as AnyRecord[]
  const exists = list.some((r) => keyOf(collection, r) === id)
  const next = data
    ? exists
      ? list.map((r) => (keyOf(collection, r) === id ? data : r))
      : [data, ...list]
    : list.filter((r) => keyOf(collection, r) !== id)
  return { ...s, [collection]: next }
}

/* ---------- Отправка изменений ---------- */

const dirty = new Set<string>() // "collection/id"
let flushing = false
let retryTimer: ReturnType<typeof setTimeout> | undefined

function markChanges(prev: State, next: State) {
  for (const collection of COLLECTIONS) {
    if (prev[collection] === next[collection]) continue
    const before = new Map((prev[collection] as unknown as AnyRecord[]).map((r) => [keyOf(collection, r), r]))
    const after = new Map((next[collection] as unknown as AnyRecord[]).map((r) => [keyOf(collection, r), r]))
    for (const [id, record] of after) if (before.get(id) !== record) dirty.add(`${collection}/${id}`)
    for (const id of before.keys()) if (!after.has(id)) dirty.add(`${collection}/${id}`)
  }
  setStatus({ pending: dirty.size })
  void flush()
}

// Файлы внутри записи (data URL) → загрузить на сервер, в записи оставить ссылку
async function uploadFiles(value: unknown, name = 'file'): Promise<unknown> {
  if (typeof value === 'string' && value.startsWith('data:')) {
    const ext = /^data:[^/]+\/([\w.+-]+)/.exec(value)?.[1]?.replace('jpeg', 'jpg') ?? 'bin'
    return uploadDataUrl(value, name.includes('.') ? name : `${name}.${ext}`)
  }
  if (Array.isArray(value)) return Promise.all(value.map((item) => uploadFiles(item, name)))
  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [
        key,
        await uploadFiles(
          item,
          typeof (value as AnyRecord).name === 'string' ? String((value as AnyRecord).name) : name,
        ),
      ]),
    )
    return Object.fromEntries(entries)
  }
  return value
}

const hasDataUrl = (value: unknown): boolean =>
  typeof value === 'string'
    ? value.startsWith('data:')
    : Array.isArray(value)
      ? value.some(hasDataUrl)
      : !!value && typeof value === 'object' && Object.values(value).some(hasDataUrl)

async function push(key: string) {
  const slash = key.indexOf('/')
  const collection = key.slice(0, slash) as Collection
  const id = key.slice(slash + 1)
  const local = findRecord(getState(), collection, id)
  const path = `/api/records/${collection}/${encodeURIComponent(id)}`
  if (!local) return api(path, { method: 'DELETE' })

  let data = local
  if (hasDataUrl(local)) {
    data = (await uploadFiles(local)) as AnyRecord
    // Подменяем у себя файл на ссылку, чтобы не загружать его второй раз
    applyServerState((s) => (findRecord(s, collection, id) === local ? replaceRecord(s, collection, id, data) : s))
  }
  const res = await api<{ data: AnyRecord }>(path, { method: 'PUT', body: { data } })
  // Сервер мог поправить запись (свободный номер, автор) — берём его версию, если у нас за это время ничего не менялось
  if (JSON.stringify(res.data) !== JSON.stringify(data))
    applyServerState((s) => (findRecord(s, collection, id) === data ? replaceRecord(s, collection, id, res.data) : s))
}

async function flush() {
  if (flushing) return
  flushing = true
  try {
    while (dirty.size) {
      const key = dirty.values().next().value!
      dirty.delete(key)
      setStatus({ pending: dirty.size + 1 })
      try {
        await push(key)
        setStatus({ offline: false })
      } catch (error) {
        if (error instanceof ApiError && error.status === 0) {
          // Нет связи: попробуем снова позже, изменения не теряем
          dirty.add(key)
          setStatus({ offline: true })
          clearTimeout(retryTimer)
          retryTimer = setTimeout(() => void flush(), 5000)
          break
        }
        if (error instanceof ApiError && error.status === 401) return handleSignedOut()
        // Сервер отказал: показываем причину и возвращаем то, что лежит на сервере
        setStatus({ error: apiErrorText(error) })
        await pull({ full: true })
      }
    }
  } finally {
    flushing = false
    setStatus({ pending: dirty.size })
  }
}

// Реквизиты компании (Settings → Company): логотип сначала загружаем файлом
async function pushSettings(patch: Partial<Settings>) {
  setStatus({ pending: status.pending + 1 })
  try {
    const body = { ...patch }
    if (body.companyLogo?.startsWith('data:')) {
      // Браузер без WebP сохраняет логотип в PNG — расширение берём из самого файла
      const ext = /^data:image\/(\w+)/.exec(body.companyLogo)?.[1]?.replace('jpeg', 'jpg') ?? 'png'
      body.companyLogo = await uploadDataUrl(body.companyLogo, `logo.${ext}`)
      applyServerSettings({ companyLogo: body.companyLogo })
    }
    const res = await api<{ settings: Partial<Settings> }>('/api/settings', { method: 'PUT', body })
    applyServerSettings(res.settings)
  } catch (error) {
    setStatus({ error: apiErrorText(error) })
    await pull({ full: true })
  } finally {
    setStatus({ pending: Math.max(0, status.pending - 1) })
  }
}

/* ---------- Загрузка с сервера ---------- */

let serverTime: string | undefined
let pollTimer: ReturnType<typeof setInterval> | undefined

function applySync(res: SyncResponse) {
  serverTime = res.serverTime
  setWorkspaceCompany(res.company)
  applyServerSettings(res.settings)
  const session = getSession()
  if (session && (session.role !== res.viewer.role || session.name !== res.viewer.name))
    saveSession({ ...session, role: res.viewer.role, name: res.viewer.name })
  applyServerState((s) => {
    let next: State = res.full ? { ...emptyState(), cities: [] } : s
    if (res.full) {
      for (const collection of COLLECTIONS) {
        const records = res.records.filter((r) => r.collection === collection && r.data).map((r) => r.data!)
        next = { ...next, [collection]: records }
      }
    } else {
      for (const r of res.records) {
        // То, что мы ещё не отправили, не затираем чужой версией
        if (dirty.has(`${r.collection}/${r.id}`)) continue
        next = replaceRecord(next, r.collection, r.id, r.data)
      }
    }
    // Статус «просрочен» зависит от сегодняшней даты — пересчитываем у себя
    return withFreshStatuses({ ...next, team: res.team })
  })
}

async function pull({ full = false } = {}) {
  const since = !full && serverTime ? new Date(new Date(serverTime).getTime() - OVERLAP_MS).toISOString() : undefined
  try {
    const res = await api<SyncResponse>(since ? `/api/sync?since=${encodeURIComponent(since)}` : '/api/sync')
    applySync(res)
    setStatus({ offline: false })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return handleSignedOut()
    if (error instanceof ApiError && error.code === 'blocked') {
      // Компанию заблокировали — RequireAuth покажет экран блокировки
      const me = await api<Viewer>('/api/auth/me').catch(() => undefined)
      if (me) setWorkspaceCompany(me.company)
      return
    }
    if (error instanceof ApiError && error.status === 0) setStatus({ offline: true })
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && !dirty.size) void pull()
  }, POLL_MS)
}
function stopPolling() {
  clearInterval(pollTimer)
}
const onVisible = () => {
  if (document.visibilityState === 'visible' && getSession() && !dirty.size) void pull()
}

/* ---------- Вход, выход, регистрация ---------- */

let wired = false
function wire() {
  if (wired) return
  wired = true
  onLocalChange(markChanges)
  onCompanySettingsChange((patch) => void pushSettings(patch))
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', () => void flush())
  // Закрывают вкладку, а изменение ещё не дошло до сервера — браузер переспросит
  window.addEventListener('beforeunload', (event) => {
    if (dirty.size || flushing) event.preventDefault()
  })
}

async function enter(viewer: Viewer) {
  wire()
  setWorkspaceCompany(viewer.company)
  saveSession({
    email: viewer.user.email,
    name: viewer.user.name,
    role: viewer.role,
    signedInAt: new Date().toISOString(),
  })
  if (!viewer.company.blocked) {
    await pull({ full: true })
    startPolling()
  }
  setStatus({ ready: true, error: undefined })
}

// При открытии страницы: может, человек уже вошёл (cookie жива)
let booting: Promise<void> | undefined
export function bootstrap() {
  booting ??= (async () => {
    try {
      await enter(await api<Viewer>('/api/auth/me'))
    } catch {
      setStatus({ ready: true })
    }
  })()
  return booting
}

export async function signInRemote(email: string, password: string) {
  await enter(await api<Viewer>('/api/auth/login', { body: { email, password } }))
}

export async function signUpRemote(body: unknown) {
  await enter(await api<Viewer>('/api/auth/signup', { body }))
}

export async function acceptInvite(token: string, password: string) {
  await api(`/api/invite/${token}`, { body: { password } })
  await enter(await api<Viewer>('/api/auth/me'))
}

export const inviteInfo = (token: string) =>
  api<{ email: string; name: string; company: string }>(`/api/invite/${token}`)

// Выход: на сервере закрываем сессию, у себя стираем все данные компании
export async function signOutRemote() {
  await api('/api/auth/logout', { method: 'POST', body: {} }).catch(() => undefined)
  clearLocal()
}

function clearLocal() {
  stopPolling()
  dirty.clear()
  serverTime = undefined
  applyServerState(() => emptyState())
  setWorkspaceCompany(undefined)
  saveSession(null)
  setStatus({ pending: 0, error: undefined, offline: false })
}

// Сессия истекла или человека убрали из команды
function handleSignedOut() {
  clearLocal()
}
