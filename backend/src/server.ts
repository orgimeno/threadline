import { buildApp } from './app.js'

const DEFAULT_PORT = 3000

function resolvePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT
  }

  const port = Number.parseInt(value, 10)

  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : DEFAULT_PORT
}

const app = buildApp({ logger: true })

try {
  await app.listen({
    host: '0.0.0.0',
    port: resolvePort(process.env.PORT),
  })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
