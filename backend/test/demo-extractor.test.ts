import { describe, expect, it } from 'vitest'

import { DemoExtractor } from '../src/extraction/demo-extractor.js'
import type { PreparedExtractionRequest } from '../src/extraction/extraction-request.js'

describe('DemoExtractor', () => {
  it('returns five fictional proposals from a single valid source', async () => {
    const request = {
      source: {
        file: 'fictional-notes.md',
        format: 'markdown',
      },
    } as PreparedExtractionRequest

    const entries = await new DemoExtractor().extract([request])

    expect(entries).toHaveLength(5)
    expect(entries.map((entry) => entry.id)).toEqual([
      'entry-001',
      'entry-002',
      'entry-003',
      'entry-004',
      'entry-005',
    ])
    expect(entries.every((entry) => entry.status === 'pending')).toBe(true)
    expect(entries.every((entry) => entry.sourceReferences[0]?.file === 'fictional-notes.md')).toBe(true)
  })
})
