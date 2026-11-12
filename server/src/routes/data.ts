/*
 * Данные компании: синхронизация с интерфейсом, сохранение и удаление записей, реквизиты компании.
 * Правила доступа те же, что видит человек в интерфейсе (src/data/auth.ts), но проверяются здесь:
 * интерфейс можно обойти, сервер — нет.
 */
import { and, asc, eq, gt, isNull, like, ne, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { assertAdmin, assertWritable, requireMember, viewerOf, type Viewer } from '../auth/session.ts'
import type { Db } from '../db/client.ts'
import { companies, memberships, records, users } from '../db/schema.ts'
import { companyForClient } from '../lib/company.ts'
import { forbidden, HttpError } from '../lib/http-error.ts'
import { planLabels } from '../lib/plans.ts'

export const COLLECTIONS = ['quotations', 'shipments', 'customers', 'vendors', 'invoices', 'cities'] as const
export type Collection = (typeof COLLECTIONS)[number]
type Data = Record<string, unknown>

// В каком поле записи лежит её номер. Номер уникален внутри компании
const NUMBER_FIELD: Partial<Record<Collection, string>> = {
  quotations: 'reference',
  shipments: 'number',
  invoices: 'number',
}
// Деньги перевозки (оплаты подрядчикам и доплаты) — их ведут админ и бухгалтер
const SHIPMENT_MONEY = ['vendorPayments', 'extraCharges'] as const
// Что бухгалтер может менять в инвойсе: только оплаты и то, что из них считается
const INVOICE_PAYMENT_FIELDS = ['payments', 'paid', 'discount', 'status'] as const

const params = z.object({ collection: z.enum(COLLECTIONS), id: z.string().min(1).max(120) })
const recordBody = z.object({ data: z.record(z.string(), z.unknown()) })

// Сотрудник не видит инвойсы и деньги перевозок
const canSee = (viewer: Viewer, collection: Collection) => !(viewer.role === 'employee' && collection === 'invoices')

function forViewer(viewer: Viewer, collection: Collection, data: Data): Data {
  if (viewer.role !== 'employee' || collection !== 'shipments') return data
  const copy = { ...data }
  for (const key of SHIPMENT_MONEY) delete copy[key]
  return copy
}

const isOwner = (viewer: Viewer, data?: Data) =>
  !data?.createdBy || String(data.createdBy).toLowerCase() === viewer.user.email.toLowerCase()

const pick = (data: Data | undefined, keys: readonly string[]) =>
  Object.fromEntries(keys.filter((k) => data && k in data).map((k) => [k, data![k]]))

/*
 * Что сохранить, если этот человек прислал такую запись. Бросает 403, если ему нельзя.
 * Чужие поля (то, что роли менять нельзя) берём из того, что уже лежит в базе.
 */
export function mergeForWrite(viewer: Viewer, collection: Collection, existing: Data | undefined, incoming: Data): Data {
  const { role } = viewer
  // Автора ставит сервер: подделать его из браузера нельзя
  const createdBy = existing ? existing.createdBy : viewer.user.email
  switch (collection) {
    case 'quotations':
      if (role === 'accountant') throw forbidden()
      if (role === 'employee' && existing && !isOwner(viewer, existing)) throw forbidden('not_owner')
      return { ...incoming, createdBy }
    case 'shipments':
      if (role === 'accountant') {
        if (!existing) throw forbidden()
        return { ...existing, ...pick(incoming, SHIPMENT_MONEY) }
      }
      if (role === 'employee') {
        if (existing && !isOwner(viewer, existing)) throw forbidden('not_owner')
        const rest = { ...incoming }
        for (const key of SHIPMENT_MONEY) delete rest[key]
        return { ...rest, ...pick(existing, SHIPMENT_MONEY), createdBy }
      }
      return { ...incoming, createdBy }
    case 'invoices':
      if (role === 'employee') throw forbidden()
      if (role === 'accountant') {
        if (!existing) throw forbidden()
        return { ...existing, ...pick(incoming, INVOICE_PAYMENT_FIELDS) }
      }
      return incoming
    default:
      if (role === 'accountant') throw forbidden()
      return incoming
  }
}

export function assertCanDelete(viewer: Viewer, collection: Collection, existing: Data) {
  if (collection === 'invoices') return assertAdmin(viewer)
  if (viewer.role === 'accountant') throw forbidden()
  if ((collection === 'quotations' || collection === 'shipments') && viewer.role === 'employee' && !isOwner(viewer, existing))
    throw forbidden('not_owner')
}

// Проверка формы записи. Файлы в запись не вкладываем: их загружают отдельно (/api/files), в записи только ссылка
// на свой файл. Ссылка на чужой сайт или javascript: в поле файла — попытка подсунуть коллегам вредную ссылку
const FILE_LINK = /^\/api\/files\/[0-9a-f-]{36}$/
const MAX_DEPTH = 12
export function recordProblem(value: unknown, key = '', depth = 0): string | undefined {
  if (depth > MAX_DEPTH) return 'too_deep'
  if (typeof value === 'string') {
    if (value.startsWith('data:')) return 'inline_file'
    if (key === 'dataUrl' && value && !FILE_LINK.test(value)) return 'bad_file_link'
    return undefined
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const problem = recordProblem(item, key, depth + 1)
      if (problem) return problem
    }
    return undefined
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const problem = recordProblem(v, k, depth + 1)
      if (problem) return problem
    }
  }
  return undefined
}

// Следующий свободный номер с тем же началом: AT000007 занят → AT000012, если последний был AT000011
async function nextFreeNumber(db: Db, companyId: string, collection: Collection, taken: string) {
  const match = /^(.*?)(\d+)$/.exec(taken)
  if (!match) return `${taken}-${Date.now().toString(36).toUpperCase()}`
  const [, head, digits] = match as unknown as [string, string, string]
  const escaped = head.replace(/[\\%_]/g, (ch) => `\\${ch}`)
  const rows = await db
    .select({ number: records.number })
    .from(records)
    .where(and(eq(records.companyId, companyId), eq(records.collection, collection), like(records.number, `${escaped}%`)))
  const pattern = new RegExp(`^${head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`)
  const max = rows.reduce((acc, r) => Math.max(acc, Number(pattern.exec(r.number ?? '')?.[1] ?? 0)), 0)
  return head + String(max + 1).padStart(digits.length, '0')
}

const isUniqueViolation = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string } }
  return e.code === '23505' || e.cause?.code === '23505'
}

async function saveRecord(db: Db, companyId: string, collection: Collection, id: string, input: Data) {
  const field = NUMBER_FIELD[collection]
  let data = input
  // Два человека одновременно создали документ с одним номером — второму даём следующий
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = field && typeof data[field] === 'string' && data[field] ? (data[field] as string) : null
    if (number) {
      const [clash] = await db
        .select({ id: records.id })
        .from(records)
        .where(
          and(
            eq(records.companyId, companyId),
            eq(records.collection, collection),
            eq(records.number, number),
            ne(records.id, id),
            isNull(records.deletedAt),
          ),
        )
        .limit(1)
      if (clash) {
        data = { ...data, [field!]: await nextFreeNumber(db, companyId, collection, number) }
        continue
      }
    }
    try {
      await db
        .insert(records)
        .values({ companyId, collection, id, data, number })
        .onConflictDoUpdate({
          target: [records.companyId, records.collection, records.id],
          set: { data, number, updatedAt: sql`now()`, deletedAt: null },
        })
      return data
    } catch (error) {
      if (!isUniqueViolation(error) || !number) throw error
    }
  }
  throw new HttpError(409, 'number_conflict')
}

async function findRecord(db: Db, companyId: string, collection: Collection, id: string) {
  const [row] = await db
    .select()
    .from(records)
    .where(and(eq(records.companyId, companyId), eq(records.collection, collection), eq(records.id, id)))
    .limit(1)
  return row && !row.deletedAt ? row : undefined
}

export async function teamOf(db: Db, companyId: string) {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: memberships.role, hash: users.passwordHash })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.companyId, companyId))
    .orderBy(asc(memberships.createdAt))
  // pending — человека пригласили, но он ещё не задал пароль
  return rows.map(({ hash, ...member }) => ({ ...member, pending: hash === '' }))
}

// Реквизиты компании, которые одни на всю команду. Язык, тема и уведомления — личные, живут в браузере
const settingsBody = z
  .object({
    companyName: z.string().trim().min(2).max(80),
    companyTagline: z.string().trim().max(80),
    companyAddress: z.string().trim().max(160),
    companyEmail: z.string().trim().max(100),
    companyPhone: z.string().trim().max(30),
    companyTaxId: z.string().trim().max(30),
    companyWebsite: z.string().trim().max(100),
    // Логотип — только ссылка на загруженный файл этой компании (или пусто)
    companyLogo: z.union([z.literal(''), z.string().regex(/^\/api\/files\/[0-9a-f-]{36}$/)]),
    documentPrefix: z.string().regex(/^[A-Z0-9]{2,4}$/),
    defaultCurrency: z.string().regex(/^[A-Z]{3}$/),
    quotationValidityDays: z.number().int().min(1).max(365),
    // Админ прошёл (или пропустил) первую настройку компании
    onboardingDone: z.boolean(),
  })
  .partial()
  .strict()

export async function dataRoutes(app: FastifyInstance) {
  const { db } = app
  const member = requireMember(db)

  // Всё, что нужно интерфейсу. С ?since= — только изменения после этого времени (опрос каждые несколько секунд)
  app.get('/api/sync', { preHandler: member }, async (request) => {
    const viewer = viewerOf(request)
    const { since } = z.object({ since: z.iso.datetime({ offset: true }).optional() }).parse(request.query)
    const result = await db.execute<{ now: Date }>(sql`select now() as now`)
    const serverTime = new Date(result.rows[0]!.now).toISOString()
    const rows = await db
      .select()
      .from(records)
      .where(
        and(
          eq(records.companyId, viewer.company.id),
          since ? gt(records.updatedAt, new Date(since)) : isNull(records.deletedAt),
        ),
      )
    return {
      serverTime,
      full: !since,
      viewer: { ...viewer.user, role: viewer.role },
      company: await companyForClient(db, viewer.company),
      settings: viewer.company.settings,
      team: await teamOf(db, viewer.company.id),
      records: rows
        .filter((r) => canSee(viewer, r.collection as Collection))
        .map((r) => ({
          collection: r.collection,
          id: r.id,
          data: r.deletedAt ? null : forViewer(viewer, r.collection as Collection, r.data),
        })),
    }
  })

  app.put('/api/records/:collection/:id', { preHandler: member }, async (request) => {
    const viewer = viewerOf(request)
    assertWritable(viewer)
    const { collection, id } = params.parse(request.params)
    const { data } = recordBody.parse(request.body)
    const problem = recordProblem(data)
    if (problem) throw new HttpError(400, problem)
    const existing = await findRecord(db, viewer.company.id, collection, id)
    const merged = mergeForWrite(viewer, collection, existing?.data, { ...data, id })
    const saved = await saveRecord(db, viewer.company.id, collection, id, merged)
    return { data: forViewer(viewer, collection, saved) }
  })

  app.delete('/api/records/:collection/:id', { preHandler: member }, async (request, reply) => {
    const viewer = viewerOf(request)
    assertWritable(viewer)
    const { collection, id } = params.parse(request.params)
    const existing = await findRecord(db, viewer.company.id, collection, id)
    if (!existing) return reply.code(204).send()
    assertCanDelete(viewer, collection, existing.data)
    await db
      .update(records)
      .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(records.companyId, viewer.company.id), eq(records.collection, collection), eq(records.id, id)))
    return reply.code(204).send()
  })

  app.put('/api/settings', { preHandler: member }, async (request) => {
    const viewer = viewerOf(request)
    assertWritable(viewer)
    assertAdmin(viewer)
    const patch = settingsBody.parse(request.body)
    const settings = { ...viewer.company.settings, ...patch }
    await db
      .update(companies)
      .set({ settings, ...(patch.companyName ? { name: patch.companyName } : {}) })
      .where(eq(companies.id, viewer.company.id))
    return { settings }
  })

  // «Хочу оплатить»: админ компании выбирает тариф и срок, владелец платформы видит заявку и связывается.
  // Работает и при истёкшей лицензии: именно тогда она нужнее всего
  app.post('/api/company/plan-request', { preHandler: member }, async (request) => {
    const viewer = viewerOf(request)
    assertAdmin(viewer)
    const body = z
      .object({ plan: z.enum(['lite', 'lite_plus', 'standard']), months: z.union([z.literal(1), z.literal(12)]) })
      .parse(request.body)
    const planRequest = { ...body, at: new Date().toISOString() }
    const events = [
      { id: crypto.randomUUID(), at: planRequest.at, text: 'Payment requested: {plan}, {n} mo.', params: { plan: planLabels[body.plan], n: body.months } },
      ...viewer.company.events,
    ]
    const [updated] = await db.update(companies).set({ planRequest, events }).where(eq(companies.id, viewer.company.id)).returning()
    return { company: await companyForClient(db, updated!) }
  })
}
