// Файлы пока храним прямо в браузере. Больше ~1.5 МБ браузер не потянет — такие сохраняем только как запись.
export const MAX_STORED_FILE = 1.5 * 1024 * 1024

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
