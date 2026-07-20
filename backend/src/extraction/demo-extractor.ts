import type { ContextEntry } from '../domain/threadline-schema.js'
import type { PreparedExtractionRequest } from './extraction-request.js'

/** Deterministic no-key path for judges to exercise the complete MVP workflow. */
export class DemoExtractor {
  async extract(requests: readonly PreparedExtractionRequest[]): Promise<ContextEntry[]> {
    const proposals = [
      { type: 'project', content: 'Demo proposal: Threadline is being prepared as a fictional context-review project.' },
      { type: 'preference', content: 'Demo proposal: review extracted context one entry at a time before exporting it.' },
      { type: 'event', content: 'Demo proposal: a fictional planning session took place in March 2026.' },
      { type: 'instruction', content: 'Demo proposal: preserve source references so each entry remains traceable.' },
      { type: 'fact', content: 'Demo proposal: this entry was generated locally by Demo Mode and was not sent to OpenAI.' },
    ] as const

    return proposals.map((proposal, index) => {
      const request = requests[index % requests.length]!
      return {
        id: `entry-${String(index + 1).padStart(3, '0')}`,
        ...proposal,
        date: { original: null, normalized: null, precision: 'unknown', timezone: null },
        status: 'pending',
        sourceReferences: [{
          file: request.source.file,
          location: request.source.format === 'json' ? '' : 'lines 1-1',
        }],
      }
    })
  }
}
