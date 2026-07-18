import { extname } from 'node:path'

export const IMPORT_LIMITS = {
  files: 10,
  fileSizeBytes: 2 * 1024 * 1024,
  requestSizeBytes: 10 * 1024 * 1024,
} as const

export type SourceFormat = 'json' | 'markdown'

export interface ValidatedSource {
  file: string
  format: SourceFormat
  sizeBytes: number
  status: 'validated'
}

export interface SourceValidationError {
  file: string
  code:
    | 'empty_file'
    | 'invalid_json'
    | 'invalid_utf8'
    | 'unexpected_file_field'
    | 'unsupported_file_type'
  message: string
}

export type SourceValidationResult =
  | { source: ValidatedSource; error?: never }
  | { source?: never; error: SourceValidationError }

const utf8Decoder = new TextDecoder('utf-8', { fatal: true })

function sourceFormat(filename: string): SourceFormat | null {
  const extension = extname(filename).toLowerCase()

  if (extension === '.json') {
    return 'json'
  }

  if (extension === '.md' || extension === '.markdown') {
    return 'markdown'
  }

  return null
}

export function validateSource(
  filename: string,
  fieldname: string,
  buffer: Buffer,
): SourceValidationResult {
  if (fieldname !== 'files') {
    return {
      error: {
        file: filename,
        code: 'unexpected_file_field',
        message: 'Files must use the multipart field name files.',
      },
    }
  }

  const format = sourceFormat(filename)

  if (format === null) {
    return {
      error: {
        file: filename,
        code: 'unsupported_file_type',
        message: 'Only .json, .md, and .markdown files are supported.',
      },
    }
  }

  let content: string

  try {
    content = utf8Decoder.decode(buffer)
  } catch {
    return {
      error: {
        file: filename,
        code: 'invalid_utf8',
        message: 'The file is not valid UTF-8 text and could not be processed.',
      },
    }
  }

  if (content.trim().length === 0) {
    return {
      error: {
        file: filename,
        code: 'empty_file',
        message: 'The file is empty and could not be processed.',
      },
    }
  }

  if (format === 'json') {
    try {
      JSON.parse(content)
    } catch {
      return {
        error: {
          file: filename,
          code: 'invalid_json',
          message: 'The file is not valid JSON and could not be processed.',
        },
      }
    }
  }

  return {
    source: {
      file: filename,
      format,
      sizeBytes: buffer.byteLength,
      status: 'validated',
    },
  }
}
