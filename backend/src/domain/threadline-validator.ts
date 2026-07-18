import { extname } from 'node:path'

import { Ajv, type ErrorObject } from 'ajv'

import {
  type ContextEntry,
  type DatePrecision,
  type ExtractionProposalDocument,
  type ExtractionProposalEntry,
  type SourceReference,
  type ThreadlineDate,
  type ThreadlineDocument,
  extractionProposalSchema,
  threadlineDocumentSchema,
} from './threadline-schema.js'

export interface SchemaValidationIssue {
  path: string
  keyword: string
  message: string
}

export type SchemaValidationResult<T> =
  | { valid: true; value: T; issues: [] }
  | { valid: false; issues: SchemaValidationIssue[] }

const ajv = new Ajv({ allErrors: true, strict: true })
const validateCanonicalSchema = ajv.compile(threadlineDocumentSchema)
const validateProposalSchema = ajv.compile(extractionProposalSchema)

const jsonPointerPattern = /^(?:\/(?:[^~/]|~[01])*)*$/
const markdownLineRangePattern = /^lines ([1-9]\d*)-([1-9]\d*)$/

function schemaIssues(errors: ErrorObject[] | null | undefined): SchemaValidationIssue[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath || '/',
    keyword: error.keyword,
    message: error.message ?? 'Schema validation failed.',
  }))
}

function issue(path: string, keyword: string, message: string): SchemaValidationIssue {
  return { path, keyword, message }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1] ?? 0
}

function hasValidDateParts(year: number, month?: number, day?: number): boolean {
  if (!Number.isInteger(year) || year < 0 || year > 9999) {
    return false
  }

  if (month === undefined) {
    return true
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return false
  }

  if (day === undefined) {
    return true
  }

  return Number.isInteger(day) && day >= 1 && day <= daysInMonth(year, month)
}

function normalizedMatchesPrecision(value: string, precision: DatePrecision): boolean {
  if (precision === 'unknown') {
    return false
  }

  const patterns = {
    year: /^(\d{4})$/,
    month: /^(\d{4})-(\d{2})$/,
    day: /^(\d{4})-(\d{2})-(\d{2})$/,
    hour: /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/,
    minute: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  } as const
  const match = patterns[precision].exec(value)

  if (match === null) {
    return false
  }

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = match
  const year = Number(yearValue)
  const month = monthValue === undefined ? undefined : Number(monthValue)
  const day = dayValue === undefined ? undefined : Number(dayValue)
  const hour = hourValue === undefined ? undefined : Number(hourValue)
  const minute = minuteValue === undefined ? undefined : Number(minuteValue)

  return (
    hasValidDateParts(year, month, day) &&
    (hour === undefined || (Number.isInteger(hour) && hour >= 0 && hour <= 23)) &&
    (minute === undefined || (Number.isInteger(minute) && minute >= 0 && minute <= 59))
  )
}

function isKnownTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

function validateDate(date: ThreadlineDate, path: string): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = []

  if (date.normalized !== null) {
    if (date.original === null) {
      issues.push(
        issue(
          `${path}/original`,
          'dateEvidence',
          'An original source expression is required when a normalized date is present.',
        ),
      )
    }

    if (!normalizedMatchesPrecision(date.normalized, date.precision)) {
      issues.push(
        issue(
          `${path}/normalized`,
          'datePrecision',
          `The normalized value does not match ${date.precision} precision.`,
        ),
      )
    }
  }

  if (date.timezone !== null && !isKnownTimeZone(date.timezone)) {
    issues.push(
      issue(`${path}/timezone`, 'timeZone', 'The time zone is not recognized by the runtime.'),
    )
  }

  return issues
}

function validateSourceReference(
  reference: SourceReference,
  path: string,
): SchemaValidationIssue[] {
  const extension = extname(reference.file).toLowerCase()

  if (extension === '.json') {
    return jsonPointerPattern.test(reference.location)
      ? []
      : [issue(`${path}/location`, 'jsonPointer', 'The JSON location is not a valid JSON Pointer.')]
  }

  if (extension === '.md' || extension === '.markdown') {
    const match = markdownLineRangePattern.exec(reference.location)

    if (match === null || Number(match[1]) > Number(match[2])) {
      return [
        issue(
          `${path}/location`,
          'lineRange',
          'The Markdown location must be a valid one-based line range such as lines 12-15.',
        ),
      ]
    }

    return []
  }

  return [
    issue(
      `${path}/file`,
      'sourceType',
      'A source reference must identify a .json, .md, or .markdown file.',
    ),
  ]
}

function semanticEntryIssues(
  entries: readonly (ContextEntry | ExtractionProposalEntry)[],
): SchemaValidationIssue[] {
  return entries.flatMap((entry, entryIndex) => {
    const entryPath = `/entries/${entryIndex}`

    return [
      ...validateDate(entry.date, `${entryPath}/date`),
      ...entry.sourceReferences.flatMap((reference, referenceIndex) =>
        validateSourceReference(reference, `${entryPath}/sourceReferences/${referenceIndex}`),
      ),
    ]
  })
}

function duplicateIdIssues(entries: readonly ContextEntry[]): SchemaValidationIssue[] {
  const seenIds = new Set<string>()

  return entries.flatMap((entry, index) => {
    if (seenIds.has(entry.id)) {
      return [issue(`/entries/${index}/id`, 'uniqueId', 'Entry identifiers must be unique.')]
    }

    seenIds.add(entry.id)
    return []
  })
}

export function validateThreadlineDocument(value: unknown): SchemaValidationResult<ThreadlineDocument> {
  if (!validateCanonicalSchema(value)) {
    return { valid: false, issues: schemaIssues(validateCanonicalSchema.errors) }
  }

  const document = value as ThreadlineDocument
  const issues = [...semanticEntryIssues(document.entries), ...duplicateIdIssues(document.entries)]

  return issues.length === 0
    ? { valid: true, value: document, issues: [] }
    : { valid: false, issues }
}

export function validateExtractionProposal(
  value: unknown,
): SchemaValidationResult<ExtractionProposalDocument> {
  if (!validateProposalSchema(value)) {
    return { valid: false, issues: schemaIssues(validateProposalSchema.errors) }
  }

  const proposal = value as ExtractionProposalDocument
  const issues = semanticEntryIssues(proposal.entries)

  return issues.length === 0
    ? { valid: true, value: proposal, issues: [] }
    : { valid: false, issues }
}
