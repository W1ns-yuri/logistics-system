/*
 * Команда компании и приглашения.
 * Админ добавляет человека → получает ссылку-приглашение и сам отправляет её (почта, мессенджер).
 * Человек открывает ссылку и задаёт пароль. Та же ссылка работает как сброс пароля.
 */
import { hash } from '@node-rs/argon2'
import { and, count, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { createLimiter, MINUTE } from '../auth/rate-limit.ts'
import {
  assertAdmin,
  assertWritable,
  createSession,
  findViewer,
  hashToken,
  newToken,
  requireMember,
  SESSION_COOKIE,
  viewerOf,
} from '../auth/session.ts'
import type { Db } from '../db/client.ts'
import { companies, invites, memberships, records, sessions, users } from '../db/schema.ts'
import { HttpError } from '../lib/http-error.ts'
import { seatLimit } from '../lib/plans.ts'
import { teamOf } from './data.ts'

const INVITE_DAYS = 7
const roleSchema = z.enum(['admin', 'accountant', 'employee'])
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(120))
const memberBody = z.object({ name: z.string().trim().min(2).max(80), email, role: roleSchema })
const patchBody = z.object({ name: z.string().trim().min(2).max(80), email, role: roleSchema }).partial()
const userParam = z.object({ userId: z.uuid() })

// Новая ссылка. Старые ссылки этого человека перестают работать
export async function issueInvite(db: Db, companyId: string, userId: string) {
  const token = newToken()
  await db.delete(invites).where(eq(invites.userId, userId))
  await db
    .insert(invites)
    .values({ tokenHash: hashToken(token), companyId, userId, expiresAt: new Date(Date.now() + INVITE_DAYS * 86400000) })
  return `/invite/${token}`
}

async function adminCount(db: Db, companyId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(memberships)
    .where(and(eq(memberships.companyId, companyId), eq(memberships.role, 'admin')))
  return row?.value ?? 0
}

async function findMembership(db: Db, companyId: string, userId: string) {
  const [row] = await db
    .select({ role: memberships.role, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId)))
    .limit(1)
  if (!row) throw new HttpError(404, 'not_found')
  return row
}

async function findInvite(db: Db, token: string) {
  const [row] = await db
    .select({ userId: invites.userId, companyId: invites.companyId, expiresAt: invites.expiresAt, email: users.email, name: users.name, company: companies.name })
    .from(invites)
    .innerJoin(users, eq(users.id, invites.userId))
    .innerJoin(companies, eq(companies.id, invites.companyId))
    .where(eq(invites.tokenHash, hashToken(token)))
    .limit(1)
  if (!row || row.expiresAt < new Date()) throw new HttpError(404, 'invite_expired')
  return row
}

export async function teamRoutes(app: FastifyInstance) {
  const { db } = app
  const member = requireMember(db)
  const inviteByIp = createLimiter({ limit: 30, windowMs: 15 * MINUTE })

  app.post('/api/team', { preHandler: member }, async (request, reply) => {
    const viewer = viewerOf(request)
    assertWritable(viewer)
    assertAdmin(viewer)
    const body = memberBody.parse(request.body)
    const companyId = viewer.company.id
    const team = await teamOf(db, companyId)
    if (team.length >= seatLimit(viewer.company)) throw new HttpError(409, 'seat_limit')
    if (team.some((m) => m.email === body.email)) throw new HttpError(409, 'already_member')

    let [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
    // Новый человек: пароля пока нет (пустой хэш), войти можно только по ссылке-приглашению
    if (!user) [user] = await db.insert(users).values({ email: body.email, name: body.name, passwordHash: '' }).returning()
    await db.insert(memberships).values({ companyId, userId: user!.id, role: body.role })
    // У кого пароль уже есть (работает и в другой компании), входит своим паролем — ссылка не нужна
    const inviteUrl = user!.passwordHash ? undefined : await issueInvite(db, companyId, user!.id)
    const added = (await teamOf(db, companyId)).find((m) => m.id === user!.id)
    return reply.code(201).send({ member: added, inviteUrl })
  })

  app.patch('/api/team/:userId', { preHandler: member }, async (request) => {
    const viewer = viewerOf(request)
    assertWritable(viewer)
    assertAdmin(viewer)
    const { userId } = userParam.parse(request.params)
    const patch = patchBody.parse(request.body)
    const companyId = viewer.company.id
    const current = await findMembership(db, companyId, userId)

    // В компании всегда остаётся хотя бы один админ
    if (patch.role && patch.role !== 'admin' && current.role === 'admin' && (await adminCount(db, companyId)) <= 1)
      throw new HttpError(409, 'last_admin')

    if (patch.email && patch.email !== current.email) {
      const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, patch.email)).limit(1)
      if (taken) throw new HttpError(409, 'email_taken')
      // Email — это вход. Менять его можно только тому, кто работает лишь в этой компании
      const [other] = await db
        .select({ value: count() })
        .from(memberships)
        .where(and(eq(memberships.userId, userId), sql`${memberships.companyId} <> ${companyId}`))
      if ((other?.value ?? 0) > 0) throw new HttpError(409, 'email_shared')
    }

    await db.transaction(async (tx) => {
      if (patch.name || patch.email)
        await tx
          .update(users)
          .set({ ...(patch.name ? { name: patch.name } : {}), ...(patch.email ? { email: patch.email } : {}) })
          .where(eq(users.id, userId))
      if (patch.role)
        await tx
          .update(memberships)
          .set({ role: patch.role })
          .where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId)))
      // Сменили email — котировки и перевозки человека остаются за ним
      if (patch.email && patch.email !== current.email)
        await tx
          .update(records)
          .set({
            data: sql`jsonb_set(${records.data}, '{createdBy}', to_jsonb(${patch.email}::text))`,
            updatedAt: sql`now()`,
          })
          .where(
            and(eq(records.companyId, companyId), sql`lower(${records.data}->>'createdBy') = ${current.email}`),
          )
    })
    return { team: await teamOf(db, companyId) }
  })

  app.delete('/api/team/:userId', { preHandler: member }, async (request, reply) => {
    const viewer = viewerOf(request)
    assertWritable(viewer)
    assertAdmin(viewer)
    const { userId } = userParam.parse(request.params)
    const companyId = viewer.company.id
    if (userId === viewer.user.id) throw new HttpError(409, 'cannot_remove_self')
    const current = await findMembership(db, companyId, userId)
    if (current.role === 'admin' && (await adminCount(db, companyId)) <= 1) throw new HttpError(409, 'last_admin')
    await db.transaction(async (tx) => {
      await tx.delete(memberships).where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId)))
      // Убранный человек сразу теряет доступ: его сессии в этой компании закрываем
      await tx.delete(sessions).where(and(eq(sessions.companyId, companyId), eq(sessions.userId, userId)))
      await tx.delete(invites).where(and(eq(invites.companyId, companyId), eq(invites.userId, userId)))
    })
    return reply.code(204).send()
  })

  // Новая ссылка: человек потерял приглашение или забыл пароль
  app.post('/api/team/:userId/invite', { preHandler: member }, async (request) => {
    const viewer = viewerOf(request)
    assertAdmin(viewer)
    const { userId } = userParam.parse(request.params)
    await findMembership(db, viewer.company.id, userId)
    return { inviteUrl: await issueInvite(db, viewer.company.id, userId) }
  })

  // Страница приглашения: кого и куда зовут
  app.get('/api/invite/:token', async (request, reply) => {
    if (inviteByIp.isBlocked(request.ip)) return reply.code(429).send({ error: 'too_many_attempts' })
    inviteByIp.hit(request.ip)
    const { token } = z.object({ token: z.string().min(20).max(100) }).parse(request.params)
    const invite = await findInvite(db, token)
    return { email: invite.email, name: invite.name, company: invite.company }
  })

  // Задать пароль по ссылке и сразу войти
  app.post('/api/invite/:token', async (request, reply) => {
    if (inviteByIp.isBlocked(request.ip)) return reply.code(429).send({ error: 'too_many_attempts' })
    inviteByIp.hit(request.ip)
    const { token } = z.object({ token: z.string().min(20).max(100) }).parse(request.params)
    const { password } = z.object({ password: z.string().min(8).max(200) }).parse(request.body)
    const invite = await findInvite(db, token)
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash: await hash(password) }).where(eq(users.id, invite.userId))
      await tx.delete(invites).where(eq(invites.userId, invite.userId))
      // Старый пароль больше не действует — закрываем и старые сессии
      await tx.delete(sessions).where(eq(sessions.userId, invite.userId))
    })
    const session = await createSession(db, invite.userId, invite.companyId)
    reply.setCookie(SESSION_COOKIE, session.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: app.config.COOKIE_SECURE,
      expires: session.expiresAt,
    })
    return findViewer(db, session.token).then((v) => v && { user: v.user, role: v.role })
  })
}
