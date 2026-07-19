export interface ValidatedSource {
  file: string
  format: 'json' | 'markdown'
  sizeBytes: number
  status: 'validated'
}

export interface SourceImportError {
  file: string
  code: string
  message: string
}

export interface ImportResponse {
  importId: string
  sources: ValidatedSource[]
  entries: ContextEntry[]
  errors: SourceImportError[]
}

export type EntryStatus = 'pending' | 'accepted' | 'edited' | 'rejected'

export interface ContextEntry {
  id: string
  type: string
  content: string
  status: EntryStatus
  date: { original: string | null; normalized: string | null; precision: string; timezone: string | null }
  sourceReferences: Array<{ file: string; location: string }>
}

export class ImportRequestError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: SourceImportError[]

  constructor(status: number, code: string, message: string, errors: SourceImportError[] = []) {
    super(message)
    this.name = 'ImportRequestError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSourceImportError(value: unknown): value is SourceImportError {
  return (
    isRecord(value) &&
    typeof value.file === 'string' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  )
}

function isValidatedSource(value: unknown): value is ValidatedSource {
  return (
    isRecord(value) &&
    typeof value.file === 'string' &&
    (value.format === 'json' || value.format === 'markdown') &&
    typeof value.sizeBytes === 'number' &&
    value.status === 'validated'
  )
}

function isContextEntry(value: unknown): value is ContextEntry {
  return isRecord(value) && typeof value.id === 'string' && typeof value.type === 'string' &&
    typeof value.content === 'string' && ['pending', 'accepted', 'edited', 'rejected'].includes(String(value.status)) &&
    isRecord(value.date) && Array.isArray(value.sourceReferences)
}

function isImportResponse(value: unknown): value is ImportResponse {
  return (
    isRecord(value) &&
    typeof value.importId === 'string' &&
    Array.isArray(value.sources) &&
    value.sources.every(isValidatedSource) &&
    Array.isArray(value.entries) && value.entries.every(isContextEntry) &&
    Array.isArray(value.errors) &&
    value.errors.every(isSourceImportError)
  )
}

async function responseBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function requestError(response: Response, body: unknown): ImportRequestError {
  if (isRecord(body) && isRecord(body.error)) {
    const errors = Array.isArray(body.errors) ? body.errors.filter(isSourceImportError) : []
    const code = typeof body.error.code === 'string' ? body.error.code : 'import_failed'
    const message =
      typeof body.error.message === 'string'
        ? body.error.message
        : 'The backend could not validate the selected files.'

    return new ImportRequestError(response.status, code, message, errors)
  }

  return new ImportRequestError(
    response.status,
    'import_failed',
    'The backend returned an unexpected error response.',
  )
}

export async function importSources(files: readonly File[]): Promise<ImportResponse> {
  const formData = new FormData()

  for (const file of files) {
    formData.append('files', file)
  }

  const response = await fetch(`${apiBaseUrl}/imports`, {
    method: 'POST',
    body: formData,
  })
  const body = await responseBody(response)

  if (!response.ok) {
    throw requestError(response, body)
  }

  if (!isImportResponse(body)) {
    throw new ImportRequestError(
      response.status,
      'invalid_import_response',
      'The backend returned an invalid import response.',
    )
  }

  return body
}

export async function reviewEntry(id: string, status: Exclude<EntryStatus, 'pending'>, content?: string): Promise<ContextEntry> {
  const response = await fetch(`${apiBaseUrl}/entries/${encodeURIComponent(id)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, content }),
  })
  const body = await responseBody(response)
  if (!response.ok || !isContextEntry(body)) throw requestError(response, body)
  return body
}

export async function exportContext(format: 'json' | 'markdown'): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/export?format=${format}`)
  if (!response.ok) throw requestError(response, await responseBody(response))
  return response.blob()
}
