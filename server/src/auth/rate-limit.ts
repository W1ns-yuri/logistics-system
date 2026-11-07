// Простой счётчик попыток входа в памяти: не больше LIMIT неудачных попыток за WINDOW_MS.
// Для одного сервера этого хватает; когда серверов станет несколько, счётчик переедет в базу.
const WINDOW_MS = 15 * 60 * 1000
const LIMIT = 10

const attempts = new Map<string, { count: number; resetAt: number }>()

export function isBlocked(key: string, now = Date.now()) {
  const entry = attempts.get(key)
  return !!entry && entry.resetAt > now && entry.count >= LIMIT
}

export function recordFailure(key: string, now = Date.now()) {
  const entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
  else entry.count += 1
}

export function resetAttempts(key: string) {
  attempts.delete(key)
}
