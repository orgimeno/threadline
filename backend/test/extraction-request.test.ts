import { describe, expect, it } from 'vitest'

import {
  EXTRACTION_INSTRUCTION,
  EXTRACTION_SCHEMA_NAME,
  prepareExtractionRequests,
} from '../src/extraction/extraction-request.js'
import { type ValidatedSource, validateSource } from '../src/import/source-validation.js'

function validatedSource(file: string, content: string): ValidatedSource {
  const result = validateSource(file, 'files', Buffer.from(content))

  if (result.source === undefined) {
    throw new Error(`Test source failed validation: ${result.error.code}`)
  }

  return result.source
}

describe('extraction request preparation', () => {
  it('prepares one deterministic request per validated source', () => {
    const requests = prepareExtractionRequests([
      validatedSource('conversation.json', '{"messages":[{"content":"Hello"}]}'),
      validatedSource('notes.md', '# Notes\n\nFictional context.'),
    ])

    expect(requests).toHaveLength(2)
    expect(requests[0]).toMatchObject({
      schemaName: EXTRACTION_SCHEMA_NAME,
      source: {
        sourceId: 'source-001',
        file: 'conversation.json',
        format: 'json',
        locatorStrategy: 'json-pointer',
        content: '{"messages":[{"content":"Hello"}]}',
      },
    })
    expect(requests[1]).toMatchObject({
      source: {
        sourceId: 'source-002',
        file: 'notes.md',
        format: 'markdown',
        locatorStrategy: 'markdown-line-range',
        content: '1 | # Notes\n2 | \n3 | Fictional context.',
      },
    })
  })

  it('attaches the strict extraction proposal schema to every request', () => {
    const [request] = prepareExtractionRequests([validatedSource('notes.md', '# Notes')])

    expect(request?.schema.$id).toBe('threadline.extraction-proposal.v1')
    expect(request?.schema.properties.entries.maxItems).toBe(200)
    expect(request?.schema.properties.entries.items.additionalProperties).toBe(false)
  })

  it('defines the source as untrusted and keeps backend-owned fields out of model control', () => {
    expect(EXTRACTION_INSTRUCTION).toContain('untrusted data')
    expect(EXTRACTION_INSTRUCTION).toContain('Never invent dates')
    expect(EXTRACTION_INSTRUCTION).toContain('Do not create id or status fields')
    expect(EXTRACTION_INSTRUCTION).toContain('empty entries array')
  })
})
