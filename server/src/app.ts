// Сборка приложения отдельно от запуска: тесты создают app с тестовой базой и шлют запросы без настоящего порта
import cookie from '@fastify/cookie'
import Fastify from 'fastify'
import { ZodError } from 'zod'

import type { Db } from './db/client.ts'
import type { Env } from './env.ts'
import { authRoutes } from './routes/auth.ts'
import { dataRoutes } from './routes/data.ts'
import { fileRoutes } from './routes/files.ts'
import { healthRoutes } from './routes/health.ts'
import { platformRoutes } from './routes/platform.ts'
import { teamRoutes } from './routes/team.ts'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    config: Env
  }
}

export async function buildApp({ db, config, logger = false }: { db: Db; config: Env; logger?: boolean }) {
  const app = Fastify({ logger, trustProxy: config.TRUST_PROXY, bodyLimit: 1024 * 1024 })
  app.decorate('db', db)
  app.decorate('config', config)
  await app.register(cookie)

  // Защитные заголовки на каждый ответ API
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff') // браузер не угадывает тип файла
    reply.header('X-Frame-Options', 'DENY') // API нельзя встроить в чужую страницу
    // Данные компании не оседают в кэше браузера и прокси (файлы ставят свой заголовок сами)
    if (!reply.hasHeader('Cache-Control')) reply.header('Cache-Control', 'no-store')
    reply.header('Referrer-Policy', 'no-referrer')
  })

  // Защита от CSRF: запрос, который что-то меняет, принимаем только со своего сайта.
  // Браузер всегда шлёт Origin у POST/PUT/PATCH/DELETE, и подделать его чужая страница не может.
  app.addHook('onRequest', async (request, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return
    const origin = request.headers.origin
    if (!origin) return // не браузер (curl, тесты) — там нет чужих cookie, которые можно украсть
    let host = ''
    try {
      host = new URL(origin).host
    } catch {
      // Origin: null или мусор — считаем чужим
    }
    if (host !== request.host) return reply.code(403).send({ error: 'bad_origin' })
  })

  // Ошибка проверки данных → 400 с понятным списком полей, а не 500
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'validation',
        issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
    }
    request.log.error(error)
    const status = (error as { statusCode?: number }).statusCode ?? 500
    return reply.code(status).send({ error: status === 500 ? 'internal' : (error as Error).message })
  })

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(dataRoutes)
  await app.register(fileRoutes)
  await app.register(teamRoutes)
  await app.register(platformRoutes)
  return app
}
