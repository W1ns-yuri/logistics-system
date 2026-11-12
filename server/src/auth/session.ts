// Сессии: создать при входе, найти по cookie, удалить при выходе
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, lte } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

import type { Db } from '../db/client.ts'
import { companies, memberships, sessions, users } from '../db/schema.ts'
import { forbidden, HttpError } from '../lib/http-error.ts'
import { licenseState } from '../lib/plans.ts'

export const SESSION_COOKIE = 'omni_session'
export const SESSION_DAYS = 30

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
// 32 случайных байта — угадать невозможно
export const newToken = () => randomBytes(32).toString('base64url')

export async function createSession(db: Db, userId: string, companyId: string) {
  const token = newToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, companyId, expiresAt })
  // Заодно убираем протухшие сессии этого человека, чтобы таблица не росла вечно
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lte(sessions.expiresAt, new Date())))
  // Отмечаем, что компания пользуется системой (видно владельцу платформы)
  await db.update(companies).set({ lastActiveAt: new Date() }).where(eq(companies.id, companyId))
  return { token, expiresAt }
}

export async function deleteSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
}

export type Role = 'admin' | 'accountant' | 'employee'
export type CompanyRow = typeof companies.$inferSelect

export type Viewer = {
  user: { id: string; email: string; name: string }
  company: CompanyRow
  role: Role
}

// Кто сейчас делает запрос. null — сессии нет, она истекла или человека убрали из компании
export async function findViewer(db: Db, token: string): Promise<Viewer | null> {
  const [row] = await db
    .select({ user: users, company: companies, role: memberships.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(companies, eq(companies.id, sessions.companyId))
    .innerJoin(memberships, and(eq(memberships.userId, sessions.userId), eq(memberships.companyId, sessions.companyId)))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)
  if (!row) return null
  return { user: { id: row.user.id, email: row.user.email, name: row.user.name }, company: row.company, role: row.role }
}

declare module 'fastify' {
  interface FastifyRequest {
    viewer?: Viewer
  }
}

// Для маршрутов с данными компании: без входа — 401, заблокированная компания — 403
export function requireMember(db: Db) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies[SESSION_COOKIE]
    const viewer = token ? await findViewer(db, token) : null
    if (!viewer) return reply.code(401).send({ error: 'unauthorized' })
    if (viewer.company.blocked) return reply.code(403).send({ error: 'blocked' })
    request.viewer = viewer
  }
}

export function viewerOf(request: FastifyRequest): Viewer {
  if (!request.viewer) throw new HttpError(401, 'unauthorized')
  return request.viewer
}

// Лицензия истекла — только просмотр
export function assertWritable(viewer: Viewer) {
  if (licenseState(viewer.company) !== 'active') throw forbidden('read_only')
}

export function assertAdmin(viewer: Viewer) {
  if (viewer.role !== 'admin') throw forbidden()
}
