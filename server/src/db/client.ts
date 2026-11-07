import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from './schema.ts'

// Пул соединений: сервер держит несколько открытых подключений и раздаёт их запросам
export function createDb(url: string) {
  const pool = new pg.Pool({ connectionString: url, max: 10 })
  const db = drizzle(pool, { schema })
  return { db, pool }
}

export type Db = ReturnType<typeof createDb>['db']
