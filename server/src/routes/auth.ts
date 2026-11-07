// Регистрация компании, вход, выход и «кто я»
import { hash, verify } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { createLimiter, MINUTE } from '../auth/rate-limit.ts'
import { createSession, deleteSession, findViewer, SESSION_COOKIE } from '../auth/session.ts'
import { companies, memberships, users } from '../db/schema.ts'

const TRIAL_DAYS = 14

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(120))
const password = z.string().min(8).max(200)

const signupBody = z.object({
  companyName: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(80),
  email,
  password,
})

const loginBody = z.object({ email, password: z.string().min(1).max(200) })

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

// Хэш несуществующего пароля. Если email не найден, всё равно проверяем пароль против него:
// так ответ приходит за то же время, и по скорости нельзя понять, есть ли такой email в системе
const dummyHash = hash('dummy-password-for-timing')

export async function authRoutes(app: FastifyInstance) {
  const { db } = app
  // Лимиты живут вместе с приложением (у каждого теста свои)
  const loginByEmail = createLimiter({ limit: 10, windowMs: 15 * MINUTE }) // 10 неверных паролей на «email + IP»
  const loginByIp = createLimiter({ limit: 50, windowMs: 15 * MINUTE }) // и 50 с одного IP на любые email
  const signupByIp = createLimiter({ limit: 5, windowMs: 60 * MINUTE }) // 5 регистраций с IP в час, чтобы не засорили базу

  const setCookie = (reply: FastifyReply, token: string, expiresAt: Date) =>
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true, // JavaScript на странице не может прочитать cookie — защита от кражи через XSS
      sameSite: 'lax',
      secure: app.config.COOKIE_SECURE,
      expires: expiresAt,
    })

  app.post('/api/auth/signup', async (request, reply) => {
    const body = signupBody.parse(request.body)
    if (signupByIp.isBlocked(request.ip)) return reply.code(429).send({ error: 'too_many_attempts' })
    signupByIp.hit(request.ip)
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1)
    if (existing) return reply.code(409).send({ error: 'email_taken' })

    const passwordHash = await hash(body.password)
    const paidUntil = isoDate(new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000))

    // Компания, человек и его роль создаются вместе: если что-то упадёт, не останется половины данных
    const { userId, companyId } = await db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({ name: body.companyName, country: body.country, paidUntil })
        .returning({ id: companies.id })
      const [user] = await tx
        .insert(users)
        .values({ email: body.email, name: body.name, passwordHash })
        .returning({ id: users.id })
      await tx.insert(memberships).values({ companyId: company!.id, userId: user!.id, role: 'admin' })
      return { userId: user!.id, companyId: company!.id }
    })

    const { token, expiresAt } = await createSession(db, userId, companyId)
    setCookie(reply, token, expiresAt)
    return reply.code(201).send(await findViewer(db, token))
  })

  app.post('/api/auth/login', async (request, reply) => {
    const body = loginBody.parse(request.body)
    const key = `${body.email}|${request.ip}`
    if (loginByEmail.isBlocked(key) || loginByIp.isBlocked(request.ip))
      return reply.code(429).send({ error: 'too_many_attempts' })

    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
    // Одна и та же ошибка и одно и то же время ответа для «нет такого email» и «неверный пароль»:
    // не подсказываем, какие email есть в системе
    const ok = await verify(user?.passwordHash ?? (await dummyHash), body.password)
    if (!user || !ok) {
      loginByEmail.hit(key)
      loginByIp.hit(request.ip)
      return reply.code(401).send({ error: 'invalid_credentials' })
    }
    loginByEmail.reset(key)

    // Пока входим в первую компанию человека; переключение между компаниями добавим, когда понадобится
    const [membership] = await db.select().from(memberships).where(eq(memberships.userId, user.id)).limit(1)
    if (!membership) return reply.code(403).send({ error: 'no_company' })

    const { token, expiresAt } = await createSession(db, user.id, membership.companyId)
    setCookie(reply, token, expiresAt)
    return findViewer(db, token)
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await deleteSession(db, token)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return reply.code(204).send()
  })

  app.get('/api/auth/me', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    const viewer = token ? await findViewer(db, token) : null
    if (!viewer) return reply.code(401).send({ error: 'unauthorized' })
    return viewer
  })
}
