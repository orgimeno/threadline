import type { ContextEntry } from '../domain/threadline-schema.js'
import type { PreparedExtractionRequest } from './extraction-request.js'

/** Deterministic no-key path for judges to exercise the complete MVP workflow. */
export class DemoExtractor {
  async extract(requests: readonly PreparedExtractionRequest[]): Promise<ContextEntry[]> {
    return requests.map((request, index) => ({
      id: `entry-${String(index + 1).padStart(3, '0')}`,
      type: 'other',
      content: `Demo context proposal extracted from ${request.source.file}.`,
      date: { original: null, normalized: null, precision: 'unknown', timezone: null },
      status: 'pending',
      sourceReferences: [{
        file: request.source.file,
        location: request.source.format === 'json' ? '' : 'lines 1-1',
      }],
    }))
  }
}
