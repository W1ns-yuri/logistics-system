// Все настройки сервера в одном месте. Берём из переменных окружения, у локальной разработки есть значения по умолчанию.
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().default('postgres://omni:omni@localhost:5432/omniroute'),
  PORT: z.coerce.number().default(3000),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
})

export const env = schema.parse(process.env)
export type Env = typeof env
