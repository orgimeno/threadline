export const THREADLINE_SCHEMA_VERSION = 'threadline.v1' as const

export const ENTRY_TYPES = ['fact', 'event', 'preference', 'instruction', 'project', 'other'] as const
export const ENTRY_STATUSES = ['pending', 'accepted', 'edited', 'rejected'] as const
export const DATE_PRECISIONS = ['minute', 'hour', 'day', 'month', 'year', 'unknown'] as const

export type EntryType = (typeof ENTRY_TYPES)[number]
export type EntryStatus = (typeof ENTRY_STATUSES)[number]
export type DatePrecision = (typeof DATE_PRECISIONS)[number]

export interface ThreadlineDate {
  original: string | null
  normalized: string | null
  precision: DatePrecision
  timezone: string | null
}

export interface SourceReference {
  file: string
  location: string
}

export interface ExtractionProposalEntry {
  type: EntryType
  content: string
  date: ThreadlineDate
  sourceReferences: SourceReference[]
}

export interface ExtractionProposalDocument {
  entries: ExtractionProposalEntry[]
}

export interface ContextEntry extends ExtractionProposalEntry {
  id: string
  status: EntryStatus
}

export interface ThreadlineDocument {
  schemaVersion: typeof THREADLINE_SCHEMA_VERSION
  entries: ContextEntry[]
}

const dateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['original', 'normalized', 'precision', 'timezone'],
  properties: {
    original: {
      type: ['string', 'null'],
      minLength: 1,
    },
    normalized: {
      type: ['string', 'null'],
      minLength: 4,
    },
    precision: {
      type: 'string',
      enum: DATE_PRECISIONS,
    },
    timezone: {
      type: ['string', 'null'],
      minLength: 1,
    },
  },
} as const

const sourceReferenceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'location'],
  properties: {
    file: {
      type: 'string',
      minLength: 1,
      pattern: '\\S',
    },
    location: {
      type: 'string',
    },
  },
} as const

const proposalEntryProperties = {
  type: {
    type: 'string',
    enum: ENTRY_TYPES,
  },
  content: {
    type: 'string',
    minLength: 1,
    pattern: '\\S',
  },
  date: dateSchema,
  sourceReferences: {
    type: 'array',
    minItems: 1,
    items: sourceReferenceSchema,
  },
} as const

export const extractionProposalSchema = {
  $id: 'threadline.extraction-proposal.v1',
  type: 'object',
  additionalProperties: false,
  required: ['entries'],
  properties: {
    entries: {
      type: 'array',
      maxItems: 200,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'content', 'date', 'sourceReferences'],
        properties: proposalEntryProperties,
      },
    },
  },
} as const

export const threadlineDocumentSchema = {
  $id: THREADLINE_SCHEMA_VERSION,
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'entries'],
  properties: {
    schemaVersion: {
      type: 'string',
      const: THREADLINE_SCHEMA_VERSION,
    },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'content', 'date', 'status', 'sourceReferences'],
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            pattern: '\\S',
          },
          ...proposalEntryProperties,
          status: {
            type: 'string',
            enum: ENTRY_STATUSES,
          },
        },
      },
    },
  },
} as const

export function emptyThreadlineDocument(): ThreadlineDocument {
  return {
    schemaVersion: THREADLINE_SCHEMA_VERSION,
    entries: [],
  }
}
