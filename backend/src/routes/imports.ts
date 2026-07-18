import { randomUUID } from 'node:crypto'

import type { FastifyPluginAsync } from 'fastify'

import { httpError } from '../http-error.js'
import {
  IMPORT_LIMITS,
  type SourceValidationError,
  type ValidatedSource,
  validateSource,
} from '../import/source-validation.js'

function contentLengthExceedsLimit(value: string | undefined): boolean {
  if (value === undefined) {
    return false
  }

  const contentLength = Number.parseInt(value, 10)

  return Number.isFinite(contentLength) && contentLength > IMPORT_LIMITS.requestSizeBytes
}

export const importRoutes: FastifyPluginAsync = async (app) => {
  app.post('/imports', async (request, reply) => {
    if (!request.isMultipart()) {
      return reply
        .code(400)
        .send(httpError('multipart_required', 'The request must use multipart/form-data.'))
    }

    if (contentLengthExceedsLimit(request.headers['content-length'])) {
      return reply
        .code(413)
        .send(httpError('request_too_large', 'The complete import request must be 10 MiB or smaller.'))
    }

    const sources: ValidatedSource[] = []
    const errors: SourceValidationError[] = []
    let fileCount = 0
    let totalFileBytes = 0
    let fileLimitExceeded = false
    let totalLimitExceeded = false

    try {
      for await (const part of request.files()) {
        fileCount += 1

        let buffer: Buffer

        try {
          buffer = await part.toBuffer()
        } catch (error) {
          if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
            fileLimitExceeded = true
            continue
          }

          throw error
        }

        totalFileBytes += buffer.byteLength
        totalLimitExceeded ||= totalFileBytes > IMPORT_LIMITS.requestSizeBytes

        const result = validateSource(part.filename, part.fieldname, buffer)

        if (result.error !== undefined) {
          errors.push(result.error)
        } else {
          sources.push(result.source)
        }
      }
    } catch (error) {
      if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
        return reply
          .code(413)
          .send(httpError('file_too_large', 'Each imported file must be 2 MiB or smaller.'))
      }

      if (
        error instanceof app.multipartErrors.FilesLimitError ||
        error instanceof app.multipartErrors.PartsLimitError
      ) {
        return reply
          .code(413)
          .send(httpError('too_many_files', `An import can contain at most ${IMPORT_LIMITS.files} files.`))
      }

      if (error instanceof app.multipartErrors.FieldsLimitError) {
        return reply
          .code(400)
          .send(httpError('unexpected_field', 'The multipart request may contain only file parts.'))
      }

      throw error
    }

    if (fileLimitExceeded) {
      return reply
        .code(413)
        .send(httpError('file_too_large', 'Each imported file must be 2 MiB or smaller.'))
    }

    if (totalLimitExceeded) {
      return reply
        .code(413)
        .send(httpError('request_too_large', 'The imported files must total 10 MiB or less.'))
    }

    if (fileCount === 0) {
      return reply.code(400).send(httpError('files_required', 'At least one file is required.'))
    }

    if (sources.length === 0) {
      return reply.code(422).send({
        ...httpError('no_valid_sources', 'None of the imported files passed technical validation.'),
        errors,
      })
    }

    return reply.send({
      importId: `import-${randomUUID()}`,
      sources,
      entries: [],
      errors,
    })
  })
}
