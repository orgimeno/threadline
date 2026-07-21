import OpenAI from 'openai'

import type { ContextEntry, ExtractionProposalDocument } from '../domain/threadline-schema.js'
import { validateExtractionProposal, type SchemaValidationIssue } from '../domain/threadline-validator.js'
import type { PreparedExtractionRequest } from './extraction-request.js'

const MAX_SOURCE_TOKENS = 12_000
const MAX_IMPORT_TOKENS = 24_000
const MAX_OUTPUT_TOKENS = 4_000

export const DEFAULT_OPENAI_MODEL = 'gpt-5.6-terra'

export function resolveOpenAIModel(value: string | undefined): string {
  const model = value?.trim()
  return model === undefined || model.length === 0 ? DEFAULT_OPENAI_MODEL : model
}

export interface LocatorVerificationFailure {
  file: string
  location: string
  expectedFile: string
  format: 'json' | 'markdown'
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    options?: ErrorOptions & {
      invalidReferences?: LocatorVerificationFailure[]
      validationIssues?: SchemaValidationIssue[]
    },
  ) {
    super(message, options)
    this.invalidReferences = options?.invalidReferences
    this.validationIssues = options?.validationIssues
  }

  readonly invalidReferences: LocatorVerificationFailure[] | undefined
  readonly validationIssues: SchemaValidationIssue[] | undefined
}

export interface ExtractionService {
  extract(requests: readonly PreparedExtractionRequest[]): Promise<ContextEntry[]>
}

function safeOpenAIError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    if ((error as { code?: unknown }).code === 'insufficient_quota') {
      return 'OpenAI API billing or credits are required before extraction can run.'
    }
  }
  return 'OpenAI could not process this import. Please try again.'
}

function estimatedTokens(value: string): number {
  return Math.ceil(value.length / 4)
}

function locatorExists(request: PreparedExtractionRequest, file: string, location: string): boolean {
  if (file !== request.source.file) return false
  if (request.source.format === 'markdown') {
    const match = /^lines (\d+)-(\d+)$/.exec(location)
    if (match === null) return false
    const lines = request.source.content.split('\n').length
    return Number(match[1]) <= Number(match[2]) && Number(match[2]) <= lines
  }
  try {
    if (location !== '' && !location.startsWith('/')) return false
    const pointer = location === '' ? [] : location.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    let value: unknown = JSON.parse(request.source.content)
    for (const part of pointer) {
      if (typeof value !== 'object' || value === null || !(part in value)) return false
      value = (value as Record<string, unknown>)[part]
    }
    return true
  } catch { return false }
}

export class OpenAIExtractor {
  private readonly client: OpenAI
  constructor(apiKey: string, private readonly model: string) {     // `model = 'gpt-5.6-terra'` for Openai build week
    this.client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 })
  }

  async extract(requests: readonly PreparedExtractionRequest[]): Promise<ContextEntry[]> {
    const total = requests.reduce((sum, request) => sum + estimatedTokens(request.source.content), 0)
    if (total > MAX_IMPORT_TOKENS || requests.some((request) => estimatedTokens(request.source.content) > MAX_SOURCE_TOKENS)) {
      throw new ExtractionError('The selected source is too large for the MVP extraction budget.')
    }
    const entries: ContextEntry[] = []
    for (const request of requests) {
      let response: { output_text: string }
      try {
        response = await this.client.responses.create({     //Openai request
          model: this.model,
          instructions: request.instruction,
          input: `Source file: ${request.source.file}\nFormat: ${request.source.format}\nLocator strategy: ${request.source.locatorStrategy}\n<source>\n${request.source.content}\n</source>`,
          store: false,
          max_output_tokens: MAX_OUTPUT_TOKENS,
          text: { format: { type: 'json_schema', name: request.schemaName, strict: true, schema: request.schema } },
        } as never) as { output_text: string }
      } catch (error) {
        throw new ExtractionError(safeOpenAIError(error), { cause: error })
      }
      let raw: unknown
      try { raw = JSON.parse(response.output_text) } catch { throw new ExtractionError('OpenAI returned an invalid structured response.') }
      const proposal = validateExtractionProposal(raw)
      if (!proposal.valid) {
        throw new ExtractionError('OpenAI returned structured entries with invalid fields or source references.', {
          validationIssues: proposal.issues,
        })
      }
      const invalidReferences = proposal.value.entries
        .flatMap((entry) => entry.sourceReferences)
        .filter((reference) => !locatorExists(request, reference.file, reference.location))
        .map((reference) => ({
          file: reference.file,
          location: reference.location,
          expectedFile: request.source.file,
          format: request.source.format,
        }))
      if (invalidReferences.length > 0) {
        throw new ExtractionError(
          'OpenAI returned entries that could not be verified against their source.',
          { invalidReferences },
        )
      }
      for (const proposalEntry of proposal.value.entries) entries.push({ ...proposalEntry, id: `entry-${String(entries.length + 1).padStart(3, '0')}`, status: 'pending' })
    }
    return entries
  }
}
