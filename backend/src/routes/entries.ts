import type { FastifyPluginAsync } from 'fastify'

import { httpError } from '../http-error.js'

interface EntryParams {
  id: string
}

export const entriesRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: EntryParams }>('/entries/:id', async (request, reply) => {
    return reply.code(501).send(
      httpError(
        'entry_review_not_implemented',
        `Entry review is not available yet for ${request.params.id}.`,
      ),
    )
  })
}
