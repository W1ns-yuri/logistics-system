/*
 * Связь с сервером. Сборка бывает двух видов:
 * - демо (Vercel): всё хранится в браузере, сервера нет;
 * - рабочая (VITE_BACKEND=server): данные в общей базе на сервере, вход по паролю.
 * Страницы об этом почти ничего не знают: разница спрятана в src/data/*.
 */
export const API_MODE = import.meta.env.VITE_BACKEND === 'server'

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method = options.body === undefined ? 'GET' : 'POST', body } = options
  let response: Response
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // Нет интернета или сервер недоступен
    throw new ApiError(0, 'network')
  }
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, (data as { error?: string }).error ?? 'error')
  return data as T
}

// Загрузить файл (из data URL, как его читает интерфейс) — вернёт ссылку /api/files/<id>
export async function uploadDataUrl(dataUrl: string, name: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob()
  let response: Response
  try {
    response = await fetch('/api/files', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(name) },
      body: blob,
    })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!response.ok || !data.url) throw new ApiError(response.status, data.error ?? 'upload_failed')
  return data.url
}

// Понятный текст ошибки для человека (ключ перевода)
export function apiErrorText(error: unknown): string {
  const code = error instanceof ApiError ? error.code : 'error'
  const texts: Record<string, string> = {
    network: 'No connection to the server. Check the internet and try again.',
    invalid_credentials: 'Wrong email or password.',
    too_many_attempts: 'Too many attempts. Wait 15 minutes and try again.',
    email_taken: 'This email is already registered.',
    read_only: 'The license has expired: data can be viewed but not changed.',
    blocked: 'The account is blocked. Contact support.',
    forbidden: 'You do not have permission for this action.',
    not_owner: 'Only the author or an admin can change this record.',
    seat_limit: 'All seats of your plan are taken.',
    last_admin: 'The company must keep at least one admin.',
    already_member: 'This email is already in the team.',
    email_shared: 'This person also works in another company, so their email cannot be changed here.',
    invite_expired: 'The link has expired or was already used. Ask your admin for a new one.',
    cannot_remove_self: 'You cannot remove yourself.',
  }
  if (code.startsWith('file_')) return 'The file was not accepted. Allowed: PDF, images, Word and Excel up to 10 MB.'
  return texts[code] ?? 'Something went wrong. Try again.'
}
