// Создать (или обновить пароль) владельца платформы:
//   npm run owner -- owner@example.com "Имя" "длинный-пароль"
import { hash } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'

import { createDb } from '../db/client.ts'
import { users } from '../db/schema.ts'

const [email, name, password] = process.argv.slice(2)
if (!email || !name || !password || password.length < 12) {
  console.error('Usage: npm run owner -- <email> <name> <password, 12+ characters>')
  process.exit(1)
}
const { db, pool } = createDb(process.env.DATABASE_URL ?? 'postgres://omni:omni@localhost:5432/omniroute')
const address = email.trim().toLowerCase()
const passwordHash = await hash(password)
const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, address)).limit(1)
if (existing) await db.update(users).set({ passwordHash, isPlatformOwner: true, name }).where(eq(users.id, existing.id))
else await db.insert(users).values({ email: address, name, passwordHash, isPlatformOwner: true })
console.log(`Platform owner ready: ${address}`)
await pool.end()
