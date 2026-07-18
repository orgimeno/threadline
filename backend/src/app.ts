import Fastify, { type FastifyServerOptions } from 'fastify'

import { entriesRoutes } from './routes/entries.js'
import { exportRoutes } from './routes/export.js'
import { healthRoutes } from './routes/health.js'
import { importRoutes } from './routes/imports.js'

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options)

  app.register(healthRoutes)
  app.register(importRoutes)
  app.register(entriesRoutes)
  app.register(exportRoutes)

  return app
}
