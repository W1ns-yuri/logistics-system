/*
 * Админка владельца платформы: все компании-клиенты, лицензии, оплаты лицензий.
 * Вход отдельный (своя cookie omni_owner). Владельца создаёт команда на сервере: npm run owner
 */
import { verify, hash } from '@node-rs/argon2'
import { and, asc, desc, eq, gt, lte } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { createLimiter, MINUTE } from '../auth/rate-limit.ts'
import { hashToken, newToken } from '../auth/session.ts'
import { companies, memberships, ownerSessions, users, type LicenseEvent } from '../db/schema.ts'
import { companyForClient, findCompany } from '../lib/company.ts'
import { HttpError } from '../lib/http-error.ts'
import { issueInvite } from './team.ts'
import { addDays, daysBetween, paymentAmount, periodEnd, planLabels, PLANS, todayIso, type Plan } from '../lib/plans.ts'

export const OWNER_COOKIE = 'omni_owner'
const OWNER_SESSION_HOURS = 12
const dummyHash = hash('dummy-password-for-timing')

const actionBody = z.discriminatedUnion('type', [
  // amount и plan — если договорились о другой цене или сразу о другом тарифе
  z.object({
    type: z.literal('extend'),
    months: z.union([z.literal(1), z.literal(12)]),
    amount: z.number().min(0).max(1_000_000).optional(),
    plan: z.enum(PLANS).exclude(['trial']).optional(),
  }),
  // Оплату внесли по ошибке. Если она последняя, срок лицензии откатывается назад
  z.object({ type: z.literal('remove_payment'), paymentId: z.string().min(1).max(100) }),
  z.object({ type: z.literal('set_until'), date: z.iso.date() }),
  z.object({ type: z.literal('plan'), plan: z.enum(PLANS) }),
  z.object({ type: z.literal('block'), blocked: z.boolean() }),
  z.object({ type: z.literal('note'), note: z.string().max(2000) }),
])

export async function platformRoutes(app: FastifyInstance) {
  const { db } = app
  const loginLimit = createLimiter({ limit: 10, windowMs: 15 * MINUTE })
  // Вход владельца — самый ценный: ещё и 20 попыток на email с любых IP
  const accountLimit = createLimiter({ limit: 20, windowMs: 15 * MINUTE })

  async function requireOwner(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies[OWNER_COOKIE]
    if (!token) return reply.code(401).send({ error: 'unauthorized' })
    const [row] = await db
      .select({ email: users.email, owner: users.isPlatformOwner })
      .from(ownerSessions)
      .innerJoin(users, eq(users.id, ownerSessions.userId))
      .where(and(eq(ownerSessions.tokenHash, hashToken(token)), gt(ownerSessions.expiresAt, new Date())))
      .limit(1)
    if (!row?.owner) return reply.code(401).send({ error: 'unauthorized' })
    ;(request as FastifyRequest & { ownerEmail?: string }).ownerEmail = row.email
  }

  app.post('/api/platform/login', async (request, reply) => {
    const body = z.object({ email: z.string().trim().toLowerCase().max(120), password: z.string().min(1).max(200) }).parse(request.body)
    if (loginLimit.isBlocked(request.ip) || accountLimit.isBlocked(body.email)) return reply.code(429).send({ error: 'too_many_attempts' })
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
    const ok = (await verify(user?.passwordHash || (await dummyHash), body.password)) && !!user?.passwordHash
    if (!user || !ok || !user.isPlatformOwner) {
      loginLimit.hit(request.ip)
      accountLimit.hit(body.email)
      return reply.code(401).send({ error: 'invalid_credentials' })
    }
    const token = newToken()
    const expiresAt = new Date(Date.now() + OWNER_SESSION_HOURS * 3600000)
    await db.insert(ownerSessions).values({ tokenHash: hashToken(token), userId: user.id, expiresAt })
    await db.delete(ownerSessions).where(lte(ownerSessions.expiresAt, new Date()))
    reply.setCookie(OWNER_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'strict', secure: app.config.COOKIE_SECURE, expires: expiresAt })
    return { email: user.email }
  })

  app.post('/api/platform/logout', async (request, reply) => {
    const token = request.cookies[OWNER_COOKIE]
    if (token) await db.delete(ownerSessions).where(eq(ownerSessions.tokenHash, hashToken(token)))
    reply.clearCookie(OWNER_COOKIE, { path: '/' })
    return reply.code(204).send()
  })

  app.get('/api/platform/me', { preHandler: requireOwner }, async (request) => ({
    email: (request as FastifyRequest & { ownerEmail?: string }).ownerEmail,
  }))

  app.get('/api/platform/companies', { preHandler: requireOwner }, async () => {
    const rows = await db.select().from(companies).orderBy(desc(companies.createdAt))
    return { companies: await Promise.all(rows.map((c) => companyForClient(db, c, { withNote: true }))) }
  })

  // Админ компании забыл пароль: владелец даёт ему ссылку, по которой тот задаст новый.
  // Почты пока нет, поэтому ссылку владелец передаёт сам (мессенджер, телефон)
  app.post('/api/platform/companies/:id/access-link', { preHandler: requireOwner }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const company = await findCompany(db, id)
    if (!company) throw new HttpError(404, 'not_found')
    const [admin] = await db
      .select({ userId: memberships.userId, email: users.email })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.companyId, id), eq(memberships.role, 'admin')))
      .orderBy(asc(memberships.createdAt))
      .limit(1)
    if (!admin) throw new HttpError(404, 'no_admin')
    const link = await issueInvite(db, id, admin.userId)
    const events: LicenseEvent[] = [
      { id: crypto.randomUUID(), at: new Date().toISOString(), text: 'Sign-in link issued for {email}', params: { email: admin.email } },
      ...company.events,
    ]
    const [updated] = await db.update(companies).set({ events }).where(eq(companies.id, id)).returning()
    return { link, email: admin.email, company: await companyForClient(db, updated!, { withNote: true }) }
  })

  app.post('/api/platform/companies/:id/actions', { preHandler: requireOwner }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const action = actionBody.parse(request.body)
    const company = await findCompany(db, id)
    if (!company) throw new HttpError(404, 'not_found')
    const event = (text: string, params?: LicenseEvent['params']): LicenseEvent[] => [
      { id: crypto.randomUUID(), at: new Date().toISOString(), text, params },
      ...company.events,
    ]
    let patch: Partial<typeof companies.$inferInsert> = {}
    switch (action.type) {
      case 'extend': {
        // Пробный период при продлении становится тарифом, выбранным при регистрации (или Lite)
        const planned = (company.profile as { plannedPlan?: Plan } | null)?.plannedPlan
        const plan: Plan = action.plan ?? (company.plan === 'trial' ? (planned ?? 'lite') : (company.plan as Plan))
        // Уже истекла — от сегодня, иначе — со следующего дня после окончания
        const from = daysBetween(todayIso(), company.paidUntil) < 0 ? todayIso() : addDays(company.paidUntil, 1)
        const paidUntil = periodEnd(from, action.months)
        const payment = { id: crypto.randomUUID(), date: todayIso(), from, amount: action.amount ?? paymentAmount(plan, action.months), months: action.months, plan }
        patch = {
          plan,
          paidUntil,
          licensePayments: [...company.licensePayments, payment],
          events: event(action.months === 12 ? 'Extended by 1 year until {date}' : 'Extended by 1 month until {date}', { date: paidUntil }),
        }
        break
      }
      case 'remove_payment': {
        const payment = company.licensePayments.find((p) => p.id === action.paymentId)
        if (!payment) throw new HttpError(404, 'not_found')
        const isLast = company.licensePayments.at(-1)?.id === payment.id
        const rollBack = isLast && company.paidUntil === periodEnd(payment.from, payment.months)
        const paidUntil = rollBack ? addDays(payment.from, -1) : company.paidUntil
        patch = {
          paidUntil,
          licensePayments: company.licensePayments.filter((p) => p.id !== payment.id),
          events: event(
            rollBack ? 'Payment of {amount} removed, license until {date}' : 'Payment of {amount} removed',
            { amount: `$${payment.amount}`, date: paidUntil },
          ),
        }
        break
      }
      case 'set_until':
        patch = { paidUntil: action.date, events: event('License end date set to {date}', { date: action.date }) }
        break
      case 'plan':
        patch = { plan: action.plan, events: event('Plan changed to {plan}', { plan: planLabels[action.plan] }) }
        break
      case 'block':
        patch = { blocked: action.blocked, events: event(action.blocked ? 'Company blocked' : 'Company unblocked') }
        break
      case 'note':
        patch = { note: action.note }
        break
    }
    const [updated] = await db.update(companies).set(patch).where(eq(companies.id, id)).returning()
    return { company: await companyForClient(db, updated!, { withNote: true }) }
  })
}
