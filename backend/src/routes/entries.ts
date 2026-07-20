import type { FastifyPluginAsync, FastifyReply } from 'fastify'

import {
  THREADLINE_SCHEMA_VERSION,
  type ContextEntry,
  type EntryStatus,
  type ThreadlineDate,
} from '../domain/threadline-schema.js'
import { validateThreadlineDocument } from '../domain/threadline-validator.js'
import { httpError } from '../http-error.js'
import { SessionStore } from '../session/session-store.js'

interface EntryParams {
  id: string
}

type ReviewStatus = Exclude<EntryStatus, 'pending'>

interface ReviewBody {
  content?: unknown
  date?: unknown
  status?: unknown
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === 'accepted' || value === 'edited' || value === 'rejected'
}

function isThreadlineDate(value: unknown): value is ThreadlineDate {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    (typeof candidate.original === 'string' || candidate.original === null) &&
    (typeof candidate.normalized === 'string' || candidate.normalized === null) &&
    typeof candidate.precision === 'string' &&
    (typeof candidate.timezone === 'string' || candidate.timezone === null)
  )
}

function invalidReview(reply: FastifyReply) {
  return reply
    .code(400)
    .send(httpError('invalid_review', 'Use accepted, edited, or rejected; edited entries require valid content and date metadata.'))
}

export function entriesRoutes(sessions?: SessionStore): FastifyPluginAsync { return async (app) => {
  app.post<{ Params: EntryParams }>('/entries/:id', async (request, reply) => {
    if (sessions !== undefined) {
      const body = request.body as ReviewBody

      if (!isReviewStatus(body?.status)) {
        return invalidReview(reply)
      }

      const current = sessions.find(request.params.id)
      if (current === null) {
        return reply.code(404).send(httpError('entry_not_found', 'The entry does not exist in the current session.'))
      }

      const content = typeof body.content === 'string' ? body.content.trim() : undefined
      const date = body.date === undefined ? undefined : body.date

      if (body.status === 'edited' && (content === undefined || content.length === 0)) {
        return invalidReview(reply)
      }

      if (date !== undefined && !isThreadlineDate(date)) {
        return invalidReview(reply)
      }

      const candidate: ContextEntry = {
        ...current,
        status: body.status,
        content: content ?? current.content,
        date: date ?? current.date,
      }
      const validation = validateThreadlineDocument({
        schemaVersion: THREADLINE_SCHEMA_VERSION,
        entries: [candidate],
      })

      if (!validation.valid) {
        return invalidReview(reply)
      }

      const update: { content?: string; date?: ThreadlineDate } = {}
      if (content !== undefined) update.content = content
      if (date !== undefined) update.date = date

      const entry = sessions.update(request.params.id, body.status, update)
      return entry === null ? reply.code(404).send(httpError('entry_not_found', 'The entry does not exist in the current session.')) : reply.send(entry)
    }
    return reply.code(501).send(
      httpError(
        'entry_review_not_implemented',
        `Entry review is not available yet for ${request.params.id}.`,
      ),
    )
  })
} }
