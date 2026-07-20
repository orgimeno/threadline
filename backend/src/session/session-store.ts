import type { ContextEntry, ThreadlineDate } from '../domain/threadline-schema.js'

type ReviewStatus = 'accepted' | 'edited' | 'rejected'

interface EntryUpdate {
  content?: string
  date?: ThreadlineDate
}

function cloneEntry(entry: ContextEntry): ContextEntry {
  return {
    ...entry,
    date: { ...entry.date },
    sourceReferences: entry.sourceReferences.map((reference) => ({ ...reference })),
  }
}

export class SessionStore {
  private entries: ContextEntry[] = []

  replace(entries: ContextEntry[]): void {
    this.entries = entries.map(cloneEntry)
  }

  all(): ContextEntry[] {
    return this.entries.map(cloneEntry)
  }

  find(id: string): ContextEntry | null {
    const entry = this.entries.find((candidate) => candidate.id === id)
    return entry === undefined ? null : cloneEntry(entry)
  }

  update(id: string, status: ReviewStatus, update: EntryUpdate = {}): ContextEntry | null {
    const entry = this.entries.find((candidate) => candidate.id === id)
    if (entry === undefined) return null
    entry.status = status
    if (status === 'edited' && update.content !== undefined) entry.content = update.content
    if (status === 'edited' && update.date !== undefined) entry.date = { ...update.date }
    return cloneEntry(entry)
  }

  reopen(id: string): ContextEntry | null {
    const entry = this.entries.find((candidate) => candidate.id === id)
    if (entry === undefined) return null
    entry.status = 'pending'
    return cloneEntry(entry)
  }
}
