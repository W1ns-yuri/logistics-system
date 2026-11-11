/*
 * Какие файлы принимаем — тот же белый список, что в интерфейсе (src/lib/files.ts).
 * Сервер проверяет сам: расширение из списка и первые байты файла совпадают с форматом.
 * SVG и HTML не берём: внутри может быть скрипт.
 */
export const MAX_FILE = 10 * 1024 * 1024

const SIGNATURES: Record<string, { mime: string; magic: number[][] }> = {
  pdf: { mime: 'application/pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
  png: { mime: 'image/png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  jpg: { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  jpeg: { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  webp: { mime: 'image/webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: [[0x50, 0x4b, 0x03, 0x04]],
  },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', magic: [[0x50, 0x4b, 0x03, 0x04]] },
  doc: { mime: 'application/msword', magic: [[0xd0, 0xcf, 0x11, 0xe0]] },
  xls: { mime: 'application/vnd.ms-excel', magic: [[0xd0, 0xcf, 0x11, 0xe0]] },
}

export type FileVerdict = { ok: true; mime: string } | { ok: false; reason: 'type' | 'empty' | 'size' | 'content' }

export function checkFile(name: string, bytes: Buffer): FileVerdict {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  const known = SIGNATURES[ext]
  if (!known) return { ok: false, reason: 'type' }
  if (bytes.length === 0) return { ok: false, reason: 'empty' }
  if (bytes.length > MAX_FILE) return { ok: false, reason: 'size' }
  const matches = known.magic.some((sig) => sig.every((byte, i) => bytes[i] === byte))
  return matches ? { ok: true, mime: known.mime } : { ok: false, reason: 'content' }
}

// Картинки и PDF браузер показывает сам, остальное — только скачать
export const isInline = (mime: string) => mime.startsWith('image/') || mime === 'application/pdf'
