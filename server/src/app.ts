// Сборка приложения отдельно от запуска: тесты создают app с тестовой базой и шлют запросы без настоящего порта
import cookie from '@fastify/cookie'
import Fastify from 'fastify'
import { ZodError } from 'zod'

import type { Db } from './db/client.ts'
import type { Env } from './env.ts'
import { authRoutes } from './routes/auth.ts'
import { healthRoutes } from './routes/health.ts'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    config: Env
  }
}

export async function buildApp({ db, config, logger = false }: { db: Db; config: Env; logger?: boolean }) {
  const app = Fastify({ logger, trustProxy: true })
  app.decorate('db', db)
  app.decorate('config', config)
  await app.register(cookie)

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
  return app
}
