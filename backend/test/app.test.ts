import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.js'

describe('Threadline backend skeleton', () => {
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    app = buildApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('reports a healthy service', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      service: 'threadline-backend',
      status: 'ok',
    })
  })

  it('exports an empty canonical JSON document', async () => {
    const response = await app.inject({ method: 'GET', url: '/export?format=json' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      schemaVersion: 'threadline.v1',
      entries: [],
    })
  })

  it('exports an empty Markdown document', async () => {
    const response = await app.inject({ method: 'GET', url: '/export?format=markdown' })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/markdown')
    expect(response.body).toContain('# Threadline context')
  })

  it('rejects an unknown export format', async () => {
    const response = await app.inject({ method: 'GET', url: '/export?format=xml' })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('invalid_export_format')
  })

  it('exposes imports as an explicit unimplemented boundary', async () => {
    const response = await app.inject({ method: 'POST', url: '/imports' })

    expect(response.statusCode).toBe(501)
    expect(response.json().error.code).toBe('import_not_implemented')
  })

  it('exposes entry review as an explicit unimplemented boundary', async () => {
    const response = await app.inject({ method: 'POST', url: '/entries/entry-001' })

    expect(response.statusCode).toBe(501)
    expect(response.json().error.code).toBe('entry_review_not_implemented')
  })
})
