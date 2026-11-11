// Ошибка с HTTP-кодом: бросаем в любом месте, обработчик в app.ts превращает её в ответ { error }
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}
export const forbidden = (reason = 'forbidden') => new HttpError(403, reason)
export const notFound = () => new HttpError(404, 'not_found')
