import { defineConfig } from 'drizzle-kit'

// drizzle-kit сравнивает schema.ts с прошлыми миграциями и пишет новую SQL-миграцию в drizzle/
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://omni:omni@localhost:5432/omniroute' },
})
