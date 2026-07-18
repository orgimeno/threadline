import type { FastifyPluginAsync } from 'fastify'

import { httpError } from '../http-error.js'

interface ExportQuery {
  format?: string
}

export const exportRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: ExportQuery }>('/export', async (request, reply) => {
    if (request.query.format === 'json') {
      return reply.send({
        schemaVersion: 'threadline.v1',
        entries: [],
      })
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
}
