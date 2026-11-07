import { t } from '@/i18n'

// Файлы пока храним прямо в браузере. Больше ~1.5 МБ браузер не потянет — такие сохраняем только как запись.
export const MAX_STORED_FILE = 1.5 * 1024 * 1024
// Больше 10 МБ не принимаем вообще: для документов перевозки этого с запасом хватает
export const MAX_FILE = 10 * 1024 * 1024

/*
 * Какие файлы можно прикладывать. Разрешаем только известные форматы документов и картинок (белый список).
 * Чёрный список (.js, .php, .exe…) не работает: опасных расширений сотни. Поэтому всё, чего нет в списке, отклоняем.
 * SVG и HTML не берём: внутри них может быть скрипт. Ещё сверяем первые байты файла с форматом:
 * так не пройдёт программа, которую переименовали в invoice.pdf.
 */
const IMAGES = ['jpg', 'jpeg', 'png', 'webp']
export const RECEIPT_TYPES = ['pdf', ...IMAGES]
export const DOCUMENT_FILE_TYPES = ['pdf', ...IMAGES, 'doc', 'docx', 'xls', 'xlsx']

// Для окна выбора файла: показывает только подходящие
export const acceptFor = (types: string[]) => types.map((ext) => `.${ext}`).join(',')

// Подписи форматов (первые байты файла)
const SIGNATURES: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  png: [[0x89, 0x50, 0x4e, 0x47]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF
  docx: [[0x50, 0x4b, 0x03, 0x04]], // ZIP
  xlsx: [[0x50, 0x4b, 0x03, 0x04]],
  doc: [[0xd0, 0xcf, 0x11, 0xe0]], // старый Office
  xls: [[0xd0, 0xcf, 0x11, 0xe0]],
}

export type FileProblem = 'type' | 'empty' | 'size' | 'content'

export const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

// Проверка файла перед сохранением: undefined — всё хорошо, иначе причина отказа
export async function checkFile(file: File, allowed: string[]): Promise<FileProblem | undefined> {
  const ext = extensionOf(file.name)
  if (!file.name.includes('.') || !allowed.includes(ext)) return 'type'
  if (file.size === 0) return 'empty'
  if (file.size > MAX_FILE) return 'size'
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const matches = (SIGNATURES[ext] ?? []).some((sig) => sig.every((byte, i) => head[i] === byte))
  return matches ? undefined : 'content'
}

export const fileProblemText: Record<FileProblem, string> = {
  type: '{name}: this file type is not allowed. Allowed: {types}',
  empty: '{name}: the file is empty',
  size: '{name}: larger than 10 MB',
  content: '{name}: the content does not match the file type',
}

// Текст ошибки для человека или undefined, если файл подходит
export async function fileError(file: File, allowed: string[]) {
  const problem = await checkFile(file, allowed)
  return problem ? t(fileProblemText[problem], { name: file.name, types: allowed.join(', ') }) : undefined
}

export function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Чек к оплате: имя, размер и (если небольшой) сам файл
export async function readReceipt(file: File) {
  const base = { name: file.name, size: file.size }
  return file.size > MAX_STORED_FILE ? base : { ...base, dataUrl: await readAsDataUrl(file) }
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/*
 * Фото с телефона весит 3–8 МБ и в браузер не влезает. Уменьшаем его до 1600 px по длинной стороне
 * и пережимаем в JPEG: для документа этого хватает, а файл становится в 10 раз меньше.
 * Не картинка или уже маленькая — возвращаем как есть.
 */
export async function shrinkImage(file: File, maxSide = 1600): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= MAX_STORED_FILE) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // браузер не смог открыть картинку — сохраняем как есть
  }
}
