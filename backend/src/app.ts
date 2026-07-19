import Fastify, { type FastifyServerOptions } from 'fastify'
import multipart from '@fastify/multipart'

import { IMPORT_LIMITS } from './import/source-validation.js'
import { entriesRoutes } from './routes/entries.js'
import { exportRoutes } from './routes/export.js'
import { healthRoutes } from './routes/health.js'
import { importRoutes } from './routes/imports.js'
import { OpenAIExtractor } from './extraction/openai-extractor.js'
import { SessionStore } from './session/session-store.js'

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options)
  const sessions = new SessionStore()
  const apiKey = process.env.OPENAI_API_KEY
  const extractor = apiKey === undefined ? undefined : new OpenAIExtractor(apiKey, process.env.OPENAI_MODEL)

  app.register(multipart, {
    limits: {
      fields: 0,
      files: IMPORT_LIMITS.files,
      fileSize: IMPORT_LIMITS.fileSizeBytes,
      parts: IMPORT_LIMITS.files,
    },
  })

  app.register(healthRoutes)
  app.register(importRoutes(extractor, sessions))
  app.register(entriesRoutes(sessions))
  app.register(exportRoutes(sessions))

  return app
}
