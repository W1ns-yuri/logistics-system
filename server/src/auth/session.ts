// Сессии: создать при входе, найти по cookie, удалить при выходе
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'

import type { Db } from '../db/client.ts'
import { companies, memberships, sessions, users } from '../db/schema.ts'

export const SESSION_COOKIE = 'omni_session'
export const SESSION_DAYS = 30

const hash = (token: string) => createHash('sha256').update(token).digest('hex')

export async function createSession(db: Db, userId: string, companyId: string) {
  // 32 случайных байта — угадать невозможно
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.insert(sessions).values({ tokenHash: hash(token), userId, companyId, expiresAt })
  return { token, expiresAt }
}

export async function deleteSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hash(token)))
}

export type Viewer = {
  user: { id: string; email: string; name: string }
  company: { id: string; name: string; country: string; plan: string; paidUntil: string }
  role: 'admin' | 'accountant' | 'employee'
}

// Кто сейчас делает запрос. null — сессии нет, она истекла или человека убрали из компании
export async function findViewer(db: Db, token: string): Promise<Viewer | null> {
  const [row] = await db
    .select({ user: users, company: companies, role: memberships.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(companies, eq(companies.id, sessions.companyId))
    .innerJoin(memberships, and(eq(memberships.userId, sessions.userId), eq(memberships.companyId, sessions.companyId)))
    .where(and(eq(sessions.tokenHash, hash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)
  if (!row) return null
  return {
    user: { id: row.user.id, email: row.user.email, name: row.user.name },
    company: {
      id: row.company.id,
      name: row.company.name,
      country: row.company.country,
      plan: row.company.plan,
      paidUntil: row.company.paidUntil,
    },
    role: row.role,
  }
}
