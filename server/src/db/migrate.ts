// Применяет SQL-миграции из папки drizzle/ к базе из DATABASE_URL
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'

import { createDb } from './client.ts'

export const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

export async function runMigrations(url: string) {
  const { db, pool } = createDb(url)
  try {
    await migrate(db, { migrationsFolder })
  } finally {
    await pool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL ?? 'postgres://omni:omni@localhost:5432/omniroute'
  await runMigrations(url)
  console.log('migrations applied')
}
