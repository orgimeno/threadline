import type { FastifyPluginAsync } from 'fastify'

import { httpError } from '../http-error.js'
import { SessionStore } from '../session/session-store.js'

interface EntryParams {
  id: string
}

export function entriesRoutes(sessions?: SessionStore): FastifyPluginAsync { return async (app) => {
  app.post<{ Params: EntryParams }>('/entries/:id', async (request, reply) => {
    if (sessions !== undefined) {
      const body = request.body as { status?: string; content?: string }
      if (!['accepted', 'edited', 'rejected'].includes(body?.status ?? '') || (body.status === 'edited' && (!body.content || !body.content.trim()))) return reply.code(400).send(httpError('invalid_review', 'Use accepted, edited, or rejected; edited entries require content.'))
      const entry = sessions.update(request.params.id, body.status as 'accepted' | 'edited' | 'rejected', body.content?.trim())
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
