// Для каждого файла тестов: чистая тестовая база с миграциями и приложение поверх неё
import { sql } from 'drizzle-orm'

import { buildApp } from '../src/app.ts'
import { createDb } from '../src/db/client.ts'
import { runMigrations } from '../src/db/migrate.ts'

const url = process.env.TEST_DATABASE_URL ?? 'postgres://omni:omni@localhost:5432/omniroute_test'

export async function setup() {
  const { db, pool } = createDb(url)
  // Сносим всё и накатываем миграции заново — тесты не зависят друг от друга
  await db.execute(sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`)
  await runMigrations(url)
  const app = await buildApp({ db, config: { DATABASE_URL: url, PORT: 0, HOST: '127.0.0.1', TRUST_PROXY: 'loopback', COOKIE_SECURE: false } })
  return {
    app,
    db,
    close: async () => {
      await app.close()
      await pool.end()
    },
  }
}

// Достаём cookie сессии из ответа, чтобы отправить её в следующем запросе
export function sessionCookie(res: { cookies: { name: string; value: string }[] }): Record<string, string> {
  const c = res.cookies.find((x) => x.name === 'omni_session')
  if (!c) throw new Error('no session cookie in response')
  return { omni_session: c.value }
}

export const signupPayload = {
  companyName: 'Win Fin Logistics',
  country: 'Turkmenistan',
  name: 'Yuri W.',
  email: 'Manager@Company.com',
  password: 'correct-horse-1',
}
