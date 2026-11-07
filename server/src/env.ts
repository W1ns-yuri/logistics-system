// Все настройки сервера в одном месте. Берём из переменных окружения, у локальной разработки есть значения по умолчанию.
import { z } from 'zod'

const isProd = process.env.NODE_ENV === 'production'

const schema = z.object({
  // В проде адрес базы обязателен: пароль по умолчанию omni годится только для своего компьютера
  DATABASE_URL: isProd ? z.string().min(1) : z.string().default('postgres://omni:omni@localhost:5432/omniroute'),
  PORT: z.coerce.number().default(3000),
  // Слушаем только сам сервер: снаружи к API ходят через Nginx, напрямую к порту Node.js не достучаться
  HOST: z.string().default('127.0.0.1'),
  // Каким прокси верить в заголовке X-Forwarded-For (настоящий IP клиента для лимита попыток).
  // loopback = только Nginx на этой же машине. Иначе любой мог бы подставить чужой IP и обойти лимит.
  TRUST_PROXY: z.string().default('loopback'),
  // Cookie только по HTTPS. В проде включено по умолчанию
  COOKIE_SECURE: z
    .string()
    .default(isProd ? 'true' : 'false')
    .transform((v) => v === 'true'),
})

export const env = schema.parse(process.env)
export type Env = typeof env
