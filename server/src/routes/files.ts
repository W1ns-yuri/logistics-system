// Загрузка и выдача файлов: документы перевозок, чеки, логотип
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { assertWritable, requireMember, viewerOf } from '../auth/session.ts'
import { files } from '../db/schema.ts'
import { checkFile, isInline, MAX_FILE } from '../lib/file-check.ts'

export async function fileRoutes(app: FastifyInstance) {
  const { db } = app
  const member = requireMember(db)

  // Файл приходит как есть (тело запроса), имя — в заголовке X-File-Name
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: MAX_FILE + 1 }, (_req, body, done) =>
    done(null, body),
  )

  app.post('/api/files', { preHandler: member, bodyLimit: MAX_FILE + 1 }, async (request, reply) => {
    const viewer = viewerOf(request)
    assertWritable(viewer)
    const name = z
      .string()
      .min(1)
      .max(200)
      .parse(decodeURIComponent(String(request.headers['x-file-name'] ?? '')))
      .replace(/[\\/\r\n"]/g, '_')
    const bytes = request.body instanceof Buffer ? request.body : Buffer.alloc(0)
    const verdict = checkFile(name, bytes)
    if (!verdict.ok) return reply.code(400).send({ error: `file_${verdict.reason}` })
    const [row] = await db
      .insert(files)
      .values({ companyId: viewer.company.id, name, mime: verdict.mime, size: bytes.length, data: bytes, createdBy: viewer.user.id })
      .returning({ id: files.id })
    return reply.code(201).send({ url: `/api/files/${row!.id}`, name, size: bytes.length })
  })

  app.get('/api/files/:id', { preHandler: member }, async (request, reply) => {
    const viewer = viewerOf(request)
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    // Только файлы своей компании: чужой id даёт 404, как будто файла нет
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.companyId, viewer.company.id)))
      .limit(1)
    if (!file) return reply.code(404).send({ error: 'not_found' })
    const disposition = isInline(file.mime) ? 'inline' : 'attachment'
    reply
      .header('Content-Type', file.mime)
      .header('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`)
      // Файл не меняется (новая загрузка — новый id), поэтому браузер может держать его у себя
      .header('Cache-Control', 'private, max-age=31536000, immutable')
    // Открытая картинка не получает доступа к сайту. PDF так не закрыть: Chrome тогда не показывает его вовсе
    if (file.mime.startsWith('image/')) reply.header('Content-Security-Policy', "sandbox; default-src 'none'")
    return reply.send(file.data)
  })
}
