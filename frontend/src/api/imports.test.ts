import { afterEach, describe, expect, it, vi } from 'vitest'

import { ImportRequestError, importSources, reopenReviewEntry, reviewEntry } from './imports'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('importSources', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends every selected file using the repeated files field', async () => {
    const responseBody = {
      importId: 'import-test',
      sources: [
        {
          file: 'conversation.json',
          format: 'json',
          sizeBytes: 2,
          status: 'validated',
        },
      ],
      entries: [],
      errors: [],
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(responseBody))
    vi.stubGlobal('fetch', fetchMock)
    const files = [
      new File(['{}'], 'conversation.json', { type: 'application/json' }),
      new File(['# Notes'], 'notes.md', { type: 'text/markdown' }),
    ]

    await expect(importSources(files)).resolves.toEqual(responseBody)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/imports',
      expect.objectContaining({ method: 'POST' }),
    )
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    const formData = request.body as FormData
    expect(formData.getAll('files')).toEqual(files)
  })

  it('turns the backend error envelope into an ImportRequestError', async () => {
    const fileError = {
      file: 'broken.json',
      code: 'invalid_json',
      message: 'The file is not valid JSON and could not be processed.',
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 'no_valid_sources',
              message: 'None of the imported files passed technical validation.',
            },
            errors: [fileError],
          },
          422,
        ),
      ),
    )

    const request = importSources([new File(['{broken}'], 'broken.json')])

    await expect(request).rejects.toMatchObject({
      name: 'ImportRequestError',
      status: 422,
      code: 'no_valid_sources',
      errors: [fileError],
    })
  })

  it('rejects a successful HTTP response with an invalid body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'unexpected' })))

    const request = importSources([new File(['# Notes'], 'notes.md')])

    await expect(request).rejects.toEqual(
      expect.objectContaining<Partial<ImportRequestError>>({
        code: 'invalid_import_response',
        status: 200,
      }),
    )
  })

  it('sends review updates with optional date metadata', async () => {
    const responseBody = {
      id: 'entry-001',
      type: 'event',
      content: 'Jordan started a fictional ceramics course in March 2026.',
      status: 'edited',
      date: {
        original: 'March 2026',
        normalized: '2026-03',
        precision: 'month' as const,
        timezone: 'Europe/Madrid',
      },
      sourceReferences: [{ file: 'notes.md', location: 'lines 1-2' }],
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(responseBody))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      reviewEntry('entry-001', 'edited', {
        content: responseBody.content,
        date: responseBody.date,
      }),
    ).resolves.toEqual(responseBody)

    expect(fetchMock).toHaveBeenCalledWith('/api/entries/entry-001', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status: 'edited',
        content: responseBody.content,
        date: responseBody.date,
      }),
    })
  })

  it('reopens a review entry with the dedicated delete route', async () => {
    const responseBody = {
      id: 'entry-001',
      type: 'event',
      content: 'Jordan started a fictional ceramics course.',
      status: 'pending',
      date: { original: null, normalized: null, precision: 'unknown' as const, timezone: null },
      sourceReferences: [{ file: 'notes.md', location: 'lines 1-2' }],
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(responseBody))
    vi.stubGlobal('fetch', fetchMock)

    await expect(reopenReviewEntry('entry-001')).resolves.toEqual(responseBody)

    expect(fetchMock).toHaveBeenCalledWith('/api/entries/entry-001/review', { method: 'DELETE' })
  })
})
