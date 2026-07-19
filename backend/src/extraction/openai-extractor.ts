import OpenAI from 'openai'

import type { ContextEntry, ExtractionProposalDocument } from '../domain/threadline-schema.js'
import { validateExtractionProposal } from '../domain/threadline-validator.js'
import type { PreparedExtractionRequest } from './extraction-request.js'

const MAX_SOURCE_TOKENS = 12_000
const MAX_IMPORT_TOKENS = 24_000
const MAX_OUTPUT_TOKENS = 4_000

export class ExtractionError extends Error {}

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
  constructor(apiKey: string, private readonly model = 'gpt-5.6-terra') {
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
        response = await this.client.responses.create({
          model: this.model,
          instructions: request.instruction,
          input: `Source file: ${request.source.file}\nFormat: ${request.source.format}\nLocator strategy: ${request.source.locatorStrategy}\n<source>\n${request.source.content}\n</source>`,
          max_output_tokens: MAX_OUTPUT_TOKENS,
          text: { format: { type: 'json_schema', name: request.schemaName, strict: true, schema: request.schema } },
        } as never) as { output_text: string }
      } catch (error) {
        throw new ExtractionError(safeOpenAIError(error), { cause: error })
      }
      let raw: unknown
      try { raw = JSON.parse(response.output_text) } catch { throw new ExtractionError('OpenAI returned an invalid structured response.') }
      const proposal = validateExtractionProposal(raw)
      if (!proposal.valid || !proposal.value.entries.every((entry) => entry.sourceReferences.every((reference) => locatorExists(request, reference.file, reference.location)))) {
        throw new ExtractionError('OpenAI returned entries that could not be verified against their source.')
      }
      for (const proposalEntry of proposal.value.entries) entries.push({ ...proposalEntry, id: `entry-${String(entries.length + 1).padStart(3, '0')}`, status: 'pending' })
    }
    return entries
  }
}
