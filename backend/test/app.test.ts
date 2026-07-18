import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.js'

interface MultipartFile {
  content: Buffer | string
  fieldname?: string
  filename: string
  mimetype?: string
}

function multipartPayload(files: MultipartFile[]) {
  const boundary = 'threadline-test-boundary'
  const chunks: Buffer[] = []

  for (const file of files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname ?? 'files'}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype ?? 'application/octet-stream'}\r\n\r\n`,
      ),
      typeof file.content === 'string' ? Buffer.from(file.content) : file.content,
      Buffer.from('\r\n'),
    )
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`))
  const payload = Buffer.concat(chunks)

  return {
    headers: {
      'content-length': String(payload.byteLength),
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  }
}

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

  it('requires multipart content for imports', async () => {
    const response = await app.inject({ method: 'POST', url: '/imports' })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('multipart_required')
  })

  it('requires at least one multipart file', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/imports',
      ...multipartPayload([]),
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('files_required')
  })

  it('validates JSON and Markdown sources without processing them', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/imports',
      ...multipartPayload([
        {
          filename: 'conversation.json',
          mimetype: 'application/json',
          content: '{"messages":[]}',
        },
        {
          filename: 'notes.md',
          mimetype: 'text/markdown',
          content: '# Fictional notes',
        },
      ]),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      sources: [
        {
          file: 'conversation.json',
          format: 'json',
          status: 'validated',
        },
        {
          file: 'notes.md',
          format: 'markdown',
          status: 'validated',
        },
      ],
      entries: [],
      errors: [],
    })
    expect(response.json().sources.every((source: Record<string, unknown>) => !('content' in source))).toBe(
      true,
    )
    expect(response.json().importId).toMatch(/^import-/)
  })

  it('returns valid sources alongside safe per-file errors', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/imports',
      ...multipartPayload([
        { filename: 'valid.md', content: '# Valid fictional content' },
        { filename: 'broken.json', content: '{not-json}' },
        { filename: 'ignored.txt', content: 'Unsupported' },
        { filename: 'empty.md', content: '   ' },
        { filename: 'wrong-field.md', fieldname: 'upload', content: '# Wrong field' },
      ]),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().sources).toHaveLength(1)
    expect(response.json().errors).toEqual([
      {
        file: 'broken.json',
        code: 'invalid_json',
        message: 'The file is not valid JSON and could not be processed.',
      },
      {
        file: 'ignored.txt',
        code: 'unsupported_file_type',
        message: 'Only .json, .md, and .markdown files are supported.',
      },
      {
        file: 'empty.md',
        code: 'empty_file',
        message: 'The file is empty and could not be processed.',
      },
      {
        file: 'wrong-field.md',
        code: 'unexpected_file_field',
        message: 'Files must use the multipart field name files.',
      },
    ])
  })

  it('rejects an import when no source passes validation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/imports',
      ...multipartPayload([
        { filename: 'broken.json', content: '{not-json}' },
        { filename: 'invalid.md', content: Buffer.from([0xc3, 0x28]) },
      ]),
    })

    expect(response.statusCode).toBe(422)
    expect(response.json().error.code).toBe('no_valid_sources')
    expect(response.json().errors.map((error: { code: string }) => error.code)).toEqual([
      'invalid_json',
      'invalid_utf8',
    ])
  })

  it('rejects a file larger than 2 MiB', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/imports',
      ...multipartPayload([
        {
          filename: 'large.md',
          content: Buffer.alloc(2 * 1024 * 1024 + 1, 'a'),
        },
      ]),
    })

    expect(response.statusCode).toBe(413)
    expect(response.json().error.code).toBe('file_too_large')
  })

  it('rejects more than ten files', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/imports',
      ...multipartPayload(
        Array.from({ length: 11 }, (_, index) => ({
          filename: `notes-${index + 1}.md`,
          content: '# Fictional notes',
        })),
      ),
    })

    expect(response.statusCode).toBe(413)
    expect(response.json().error.code).toBe('too_many_files')
  })

  it('rejects requests larger than 10 MiB', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/imports',
      ...multipartPayload(
        Array.from({ length: 6 }, (_, index) => ({
          filename: `large-notes-${index + 1}.md`,
          content: Buffer.alloc(1_800_000, 'a'),
        })),
      ),
    })

    expect(response.statusCode).toBe(413)
    expect(response.json().error.code).toBe('request_too_large')
  })

  it('exposes entry review as an explicit unimplemented boundary', async () => {
    const response = await app.inject({ method: 'POST', url: '/entries/entry-001' })

    expect(response.statusCode).toBe(501)
    expect(response.json().error.code).toBe('entry_review_not_implemented')
  })
})
