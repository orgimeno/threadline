import type { FastifyPluginAsync } from 'fastify'

import { emptyThreadlineDocument } from '../domain/threadline-schema.js'
import { httpError } from '../http-error.js'
import { SessionStore } from '../session/session-store.js'

interface ExportQuery {
  format?: string
}

export function exportRoutes(sessions?: SessionStore): FastifyPluginAsync { return async (app) => {
  app.get<{ Querystring: ExportQuery }>('/export', async (request, reply) => {
    if (request.query.format === 'json') {
      return reply.send({ ...emptyThreadlineDocument(), entries: sessions?.all().filter((entry) => entry.status === 'accepted' || entry.status === 'edited') ?? [] })
    }

    if (request.query.format === 'markdown') {
      return reply
        .type('text/markdown; charset=utf-8')
        .send('# Threadline context\n\nNo approved entries yet.\n')
    }

    return reply
      .code(400)
      .send(httpError('invalid_export_format', 'The format query must be json or markdown.'))
  })
} }
