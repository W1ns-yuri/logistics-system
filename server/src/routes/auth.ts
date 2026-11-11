// Регистрация компании, вход, выход и «кто я»
import { hash, verify } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { createLimiter, MINUTE } from '../auth/rate-limit.ts'
import { createSession, deleteSession, findViewer, SESSION_COOKIE, type Viewer } from '../auth/session.ts'
import type { Db } from '../db/client.ts'
import { companies, memberships, users } from '../db/schema.ts'
import { companyForClient } from '../lib/company.ts'
import { PLANS, TRIAL_DAYS } from '../lib/plans.ts'

// Ответ «кто вошёл»: человек, роль и компания с лицензией
export async function viewerResponse(db: Db, viewer: Viewer) {
  return { user: viewer.user, role: viewer.role, company: await companyForClient(db, viewer.company) }
}

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
  // Дальше — необязательное: что компания рассказала о себе на шагах регистрации
  profile: z
    .object({
      city: z.string().trim().max(60),
      phone: z.string().trim().max(30),
      website: z.string().trim().max(100).optional(),
      teamSize: z.enum(['1-3', '4-10', '11-30', '30+']),
      modes: z.array(z.string().max(20)).max(10),
      plannedPlan: z.enum(PLANS).optional(),
    })
    .optional(),
  documentPrefix: z
    .string()
    .regex(/^[A-Z0-9]{2,4}$/)
    .optional(),
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
  // 30 неверных паролей на один email с любых IP: перебор пароля через тысячу прокси тоже упрётся
  const loginByAccount = createLimiter({ limit: 30, windowMs: 15 * MINUTE })
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
    // Пробный период — 14 дней, считая сегодняшний (как в интерфейсе)
    const paidUntil = isoDate(new Date(Date.now() + (TRIAL_DAYS - 1) * 24 * 60 * 60 * 1000))

    // Компания, человек и его роль создаются вместе: если что-то упадёт, не останется половины данных
    const { userId, companyId } = await db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({
          name: body.companyName,
          country: body.country,
          paidUntil,
          profile: body.profile,
          events: [
            {
              id: crypto.randomUUID(),
              at: new Date().toISOString(),
              text: 'Company registered, {n}-day trial started',
              params: { n: TRIAL_DAYS },
            },
          ],
          // Реквизиты для PDF сразу из регистрации; остальное компания заполнит в Settings
          settings: {
            companyName: body.companyName,
            companyTagline: '',
            companyAddress: [body.profile?.city, body.country].filter(Boolean).join(', '),
            companyEmail: body.email,
            companyPhone: body.profile?.phone ?? '',
            companyWebsite: body.profile?.website ?? '',
            companyTaxId: '',
            companyLogo: '',
            documentPrefix: body.documentPrefix ?? 'XX',
          },
        })
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
    return reply.code(201).send(await viewerResponse(db, (await findViewer(db, token))!))
  })

  app.post('/api/auth/login', async (request, reply) => {
    const body = loginBody.parse(request.body)
    const key = `${body.email}|${request.ip}`
    if (loginByEmail.isBlocked(key) || loginByIp.isBlocked(request.ip) || loginByAccount.isBlocked(body.email))
      return reply.code(429).send({ error: 'too_many_attempts' })

    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
    // Одна и та же ошибка и одно и то же время ответа для «нет такого email» и «неверный пароль»:
    // не подсказываем, какие email есть в системе
    // Пустой хэш — человека пригласили, но пароль он ещё не задал: войти можно только по ссылке
    const stored = user?.passwordHash || (await dummyHash)
    const ok = (await verify(stored, body.password)) && !!user?.passwordHash
    if (!user || !ok) {
      loginByEmail.hit(key)
      loginByIp.hit(request.ip)
      loginByAccount.hit(body.email)
      return reply.code(401).send({ error: 'invalid_credentials' })
    }
    loginByEmail.reset(key)

    // Пока входим в первую компанию человека; переключение между компаниями добавим, когда понадобится
    const [membership] = await db.select().from(memberships).where(eq(memberships.userId, user.id)).limit(1)
    if (!membership) return reply.code(403).send({ error: 'no_company' })

    const { token, expiresAt } = await createSession(db, user.id, membership.companyId)
    setCookie(reply, token, expiresAt)
    return viewerResponse(db, (await findViewer(db, token))!)
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
    return viewerResponse(db, viewer)
  })
}
