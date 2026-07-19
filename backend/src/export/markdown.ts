import type { ContextEntry } from '../domain/threadline-schema.js'

function sourceLabel(entry: ContextEntry): string {
  return entry.sourceReferences.map((reference) => `\`${reference.file}\`, \`${reference.location}\``).join('; ')
}

export function exportMarkdown(entries: readonly ContextEntry[]): string {
  if (entries.length === 0) return '# Threadline context\n\nNo approved entries yet.\n'

  return `# Threadline context\n\n${entries.map((entry) => {
    const date = entry.date.normalized ?? entry.date.original
    const dateLine = date === null ? '' : `\n  Date: ${date}.`
    return `## ${entry.type}\n\n- ${entry.content}${dateLine}\n  Sources: ${sourceLabel(entry)}.`
  }).join('\n\n')}\n`
}
