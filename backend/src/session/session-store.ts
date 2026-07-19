import type { ContextEntry } from '../domain/threadline-schema.js'

export class SessionStore {
  private entries: ContextEntry[] = []

  replace(entries: ContextEntry[]): void {
    this.entries = entries
  }

  all(): ContextEntry[] {
    return this.entries.map((entry) => ({ ...entry, sourceReferences: [...entry.sourceReferences] }))
  }

  update(id: string, status: 'accepted' | 'edited' | 'rejected', content?: string): ContextEntry | null {
    const entry = this.entries.find((candidate) => candidate.id === id)
    if (entry === undefined) return null
    entry.status = status
    if (status === 'edited' && content !== undefined) entry.content = content
    return { ...entry, sourceReferences: [...entry.sourceReferences] }
  }
}
