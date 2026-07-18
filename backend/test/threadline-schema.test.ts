import { describe, expect, it } from 'vitest'

import {
  type ExtractionProposalDocument,
  type ThreadlineDocument,
  emptyThreadlineDocument,
} from '../src/domain/threadline-schema.js'
import {
  validateExtractionProposal,
  validateThreadlineDocument,
} from '../src/domain/threadline-validator.js'

function canonicalDocument(): ThreadlineDocument {
  return {
    schemaVersion: 'threadline.v1',
    entries: [
      {
        id: 'entry-001',
        type: 'event',
        content: 'The fictional demonstration starts at 16:30 in Madrid.',
        date: {
          original: 'September 14, 2031 at 16:30 in Madrid',
          normalized: '2031-09-14T16:30',
          precision: 'minute',
          timezone: 'Europe/Madrid',
        },
        status: 'pending',
        sourceReferences: [
          {
            file: 'fictional-preferences.json',
            location: '/messages/2/content',
          },
          {
            file: 'fictional-project-notes.md',
            location: 'lines 9-9',
          },
        ],
      },
    ],
  }
}

function extractionProposal(): ExtractionProposalDocument {
  const { id: _id, status: _status, ...entry } = canonicalDocument().entries[0]!

  return { entries: [entry] }
}

describe('Threadline runtime schema', () => {
  it('accepts the empty canonical export', () => {
    expect(validateThreadlineDocument(emptyThreadlineDocument())).toEqual({
      valid: true,
      value: {
        schemaVersion: 'threadline.v1',
        entries: [],
      },
      issues: [],
    })
  })

  it('accepts a complete canonical entry with verifiable locator syntax', () => {
    const document = canonicalDocument()

    expect(validateThreadlineDocument(document)).toEqual({
      valid: true,
      value: document,
      issues: [],
    })
  })

  it('rejects invented or inconsistent normalized dates', () => {
    const document = canonicalDocument()
    document.entries[0]!.date.normalized = '2031-02-29T16:30'

    const result = validateThreadlineDocument(document)

    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        path: '/entries/0/date/normalized',
        keyword: 'datePrecision',
      }),
    )
  })

  it('requires original evidence for a normalized date', () => {
    const document = canonicalDocument()
    document.entries[0]!.date.original = null

    const result = validateThreadlineDocument(document)

    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        path: '/entries/0/date/original',
        keyword: 'dateEvidence',
      }),
    )
  })

  it('rejects invalid time zones and provenance locators', () => {
    const document = canonicalDocument()
    document.entries[0]!.date.timezone = 'Mars/Olympus'
    document.entries[0]!.sourceReferences[0]!.location = 'messages[2]'
    document.entries[0]!.sourceReferences[1]!.location = 'lines 12-4'

    const result = validateThreadlineDocument(document)

    expect(result.valid).toBe(false)
    expect(result.issues.map((item) => item.keyword)).toEqual([
      'timeZone',
      'jsonPointer',
      'lineRange',
    ])
  })

  it('requires unique entry identifiers', () => {
    const document = canonicalDocument()
    document.entries.push({ ...document.entries[0]!, sourceReferences: [{ file: 'root.json', location: '' }] })

    const result = validateThreadlineDocument(document)

    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual({
      path: '/entries/1/id',
      keyword: 'uniqueId',
      message: 'Entry identifiers must be unique.',
    })
  })

  it('accepts a model proposal without backend-owned id or status fields', () => {
    const proposal = extractionProposal()

    expect(validateExtractionProposal(proposal)).toEqual({
      valid: true,
      value: proposal,
      issues: [],
    })
  })

  it('rejects model proposals that assign backend-owned fields', () => {
    const proposal = extractionProposal()
    const invalidProposal = {
      entries: [
        {
          ...proposal.entries[0],
          id: 'model-created-id',
          status: 'accepted',
        },
      ],
    }

    const result = validateExtractionProposal(invalidProposal)

    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        path: '/entries/0',
        keyword: 'additionalProperties',
      }),
    )
  })

  it('rejects unknown canonical fields and states', () => {
    const document = canonicalDocument()
    const invalidDocument = {
      ...document,
      entries: [
        {
          ...document.entries[0],
          status: 'needs_review',
          confidence: 0.9,
        },
      ],
    }

    const result = validateThreadlineDocument(invalidDocument)

    expect(result.valid).toBe(false)
    expect(result.issues.map((item) => item.keyword)).toEqual(
      expect.arrayContaining(['additionalProperties', 'enum']),
    )
  })
})
