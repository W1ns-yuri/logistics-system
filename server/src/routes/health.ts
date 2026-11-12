import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

// Проверка «сервер жив и база отвечает» — её дёргает хостинг, чтобы перезапустить упавший сервер
export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => {
    await app.db.execute(sql`select 1`)
    return { ok: true }
  })
}
