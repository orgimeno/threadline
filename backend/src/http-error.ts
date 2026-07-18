export interface HttpErrorBody {
  error: {
    code: string
    message: string
  }
}

export function httpError(code: string, message: string): HttpErrorBody {
  return {
    error: {
      code,
      message,
    },
  }
}
