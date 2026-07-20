import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createResponse, createClient } = vi.hoisted(() => ({
  createResponse: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('openai', () => ({
  default: class OpenAI {
    readonly responses = { create: createResponse }

    constructor(options: unknown) {
      createClient(options)
    }
  },
}))

import { prepareExtractionRequests } from '../src/extraction/extraction-request.js'
import {
  DEFAULT_OPENAI_MODEL,
  OpenAIExtractor,
  resolveOpenAIModel,
} from '../src/extraction/openai-extractor.js'
import { validateSource } from '../src/import/source-validation.js'

describe('OpenAI extraction adapter', () => {
  beforeEach(() => {
    createResponse.mockReset()
    createClient.mockReset()
  })

  it('uses the configured model and disables response storage for every extraction request', async () => {
    const sourceResult = validateSource(
      'fictional-conversation.json',
      'files',
      Buffer.from('{"messages":[{"content":"The fictional user prefers concise answers."}]}'),
    )
    expect(sourceResult.source).toBeDefined()

    createResponse.mockResolvedValue({
      output_text: JSON.stringify({
        entries: [
          {
            type: 'preference',
            content: 'The fictional user prefers concise answers.',
            date: {
              original: null,
              normalized: null,
              precision: 'unknown',
              timezone: null,
            },
            sourceReferences: [
              {
                file: 'fictional-conversation.json',
                location: '/messages/0/content',
              },
            ],
          },
        ],
      }),
    })

    const extractor = new OpenAIExtractor('test-api-key', 'gpt-5.6-terra-test')
    const entries = await extractor.extract(prepareExtractionRequests([sourceResult.source!]))

    expect(createClient).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      timeout: 60_000,
      maxRetries: 1,
    })
    expect(createResponse).toHaveBeenCalledTimes(1)
    expect(createResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.6-terra-test',
        store: false,
      }),
    )
    expect(entries).toMatchObject([
      {
        id: 'entry-001',
        status: 'pending',
        type: 'preference',
      },
    ])
  })

  it('uses the environment value when present and one explicit fallback otherwise', () => {
    expect(resolveOpenAIModel('gpt-5.6-sol')).toBe('gpt-5.6-sol')
    expect(resolveOpenAIModel('  gpt-5.6-luna  ')).toBe('gpt-5.6-luna')
    expect(resolveOpenAIModel(undefined)).toBe(DEFAULT_OPENAI_MODEL)
    expect(resolveOpenAIModel('   ')).toBe(DEFAULT_OPENAI_MODEL)
  })
})
