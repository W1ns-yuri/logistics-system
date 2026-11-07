// Простой счётчик неудачных попыток в памяти: не больше limit попыток за windowMs на один ключ.
// Для одного сервера этого хватает; когда серверов станет несколько, счётчик переедет в базу.
type Entry = { count: number; resetAt: number }

// Чтобы память не росла бесконечно от перебора случайных email, держим не больше MAX_KEYS ключей
const MAX_KEYS = 50_000

export function createLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const attempts = new Map<string, Entry>()

  const prune = (now: number) => {
    for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key)
    // Если и после чистки слишком много — выкидываем самые старые (Map хранит порядок добавления)
    while (attempts.size >= MAX_KEYS) attempts.delete(attempts.keys().next().value!)
  }

  return {
    isBlocked(key: string, now = Date.now()) {
      const entry = attempts.get(key)
      return !!entry && entry.resetAt > now && entry.count >= limit
    },
    hit(key: string, now = Date.now()) {
      const entry = attempts.get(key)
      if (entry && entry.resetAt > now) {
        entry.count += 1
        return
      }
      if (attempts.size >= MAX_KEYS) prune(now)
      attempts.set(key, { count: 1, resetAt: now + windowMs })
    },
    reset(key: string) {
      attempts.delete(key)
    },
  }
}

export const MINUTE = 60 * 1000
