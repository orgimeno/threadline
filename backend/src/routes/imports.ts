import type { FastifyPluginAsync } from 'fastify'

import { httpError } from '../http-error.js'

export const importRoutes: FastifyPluginAsync = async (app) => {
  app.post('/imports', async (_request, reply) => {
    return reply.code(501).send(
      httpError(
        'import_not_implemented',
        'Import processing will be enabled after the multipart and extraction boundaries are implemented.',
      ),
    )
  })
}
