import Fastify, { type FastifyServerOptions } from 'fastify'
import multipart from '@fastify/multipart'

import { IMPORT_LIMITS } from './import/source-validation.js'
import { entriesRoutes } from './routes/entries.js'
import { exportRoutes } from './routes/export.js'
import { healthRoutes } from './routes/health.js'
import { importRoutes } from './routes/imports.js'

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options)

  app.register(multipart, {
    limits: {
      fields: 0,
      files: IMPORT_LIMITS.files,
      fileSize: IMPORT_LIMITS.fileSizeBytes,
      parts: IMPORT_LIMITS.files,
    },
  })

  app.register(healthRoutes)
  app.register(importRoutes)
  app.register(entriesRoutes)
  app.register(exportRoutes)

  return app
}
