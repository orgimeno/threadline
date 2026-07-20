import { describe, expect, it } from 'vitest'

import type { ContextEntry } from '../src/domain/threadline-schema.js'
import { SessionStore } from '../src/session/session-store.js'

const entry: ContextEntry = {
  id: 'entry-001',
  type: 'event',
  content: 'Jordan started a fictional ceramics course.',
  status: 'pending',
  date: {
    original: null,
    normalized: null,
    precision: 'unknown',
    timezone: null,
  },
  sourceReferences: [{ file: 'notes.md', location: 'lines 1-2' }],
}

describe('SessionStore', () => {
  it('updates edited content and date metadata', () => {
    const sessions = new SessionStore()

    sessions.replace([entry])
    const updated = sessions.update('entry-001', 'edited', {
      content: 'Jordan started a fictional ceramics course in March 2026.',
      date: {
        original: 'March 2026',
        normalized: '2026-03',
        precision: 'month',
        timezone: 'Europe/Madrid',
      },
    })

    expect(updated).toMatchObject({
      content: 'Jordan started a fictional ceramics course in March 2026.',
      date: {
        original: 'March 2026',
        normalized: '2026-03',
        precision: 'month',
        timezone: 'Europe/Madrid',
      },
      status: 'edited',
    })
  })

  it('reopens a reviewed entry without changing its content or evidence', () => {
    const sessions = new SessionStore()
    sessions.replace([{ ...entry, status: 'rejected' }])

    const reopened = sessions.reopen('entry-001')

    expect(reopened).toMatchObject({
      status: 'pending',
      content: entry.content,
      sourceReferences: entry.sourceReferences,
    })
  })
})
