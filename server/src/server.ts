// Точка входа: подключаемся к базе и слушаем порт
import { buildApp } from './app.ts'
import { createDb } from './db/client.ts'
import { env } from './env.ts'

const { db } = createDb(env.DATABASE_URL)
const app = await buildApp({ db, config: env, logger: true })
await app.listen({ port: env.PORT, host: env.HOST })
