/*
 * Правила для полей ввода: сколько символов можно и какие символы убираем сразу при вводе.
 *
 * Важно понимать: настоящая защита от SQL-инъекций и взлома — на сервере (запросы с параметрами,
 * проверка каждого поля). Фронт сервер не защищает: запрос можно отправить и в обход формы.
 * Здесь мы просто не даём ввести мусор и случайно вставить HTML-теги.
 */

// < > и ` в обычном тексте не нужны, а в HTML и скриптах это управляющие символы
const UNSAFE = /[<>`]/g
// Телефон: цифры, пробел, плюс, скобки, дефис
const NOT_PHONE = /[^\d\s+()-]/g

export const MAX_LENGTH = {
  text: 200,
  email: 100,
  phone: 20,
  password: 64,
  textarea: 2000,
}

export function cleanValue(type: string | undefined, value: string) {
  switch (type) {
    case 'tel':
      return value.replace(NOT_PHONE, '')
    case 'email':
      return value.replace(UNSAFE, '').replace(/\s/g, '')
    case 'password':
    case 'number':
    case 'date':
    case 'file':
    case 'checkbox':
    case 'radio':
      return value
    default:
      return value.replace(UNSAFE, '')
  }
}

export function maxLengthFor(type: string | undefined) {
  switch (type) {
    case 'tel':
      return MAX_LENGTH.phone
    case 'email':
      return MAX_LENGTH.email
    case 'password':
      return MAX_LENGTH.password
    case 'number':
    case 'date':
    case 'file':
    case 'checkbox':
    case 'radio':
      return undefined
    default:
      return MAX_LENGTH.text
  }
}

// Телефон похож на настоящий: от 7 до 15 цифр (международный стандарт E.164)
export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '').length
  return digits >= 7 && digits <= 15
}

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
