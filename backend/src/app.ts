import Fastify, { type FastifyServerOptions } from 'fastify'
import multipart from '@fastify/multipart'

import { IMPORT_LIMITS } from './import/source-validation.js'
import { entriesRoutes } from './routes/entries.js'
import { exportRoutes } from './routes/export.js'
import { healthRoutes } from './routes/health.js'
import { importRoutes } from './routes/imports.js'
import { OpenAIExtractor, resolveOpenAIModel } from './extraction/openai-extractor.js'
import { DemoExtractor } from './extraction/demo-extractor.js'
import { SessionStore } from './session/session-store.js'

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options)
  const sessions = new SessionStore()
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const model = resolveOpenAIModel(process.env.OPENAI_MODEL)
  const extractor = process.env.DEMO_MODE === 'true'
    ? new DemoExtractor()
    : apiKey === undefined || apiKey.length === 0 ? undefined : new OpenAIExtractor(apiKey, model)

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
