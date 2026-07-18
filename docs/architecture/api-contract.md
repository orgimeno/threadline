# Threadline API contract (initial)

> Status: **in progress**. Technical import validation exists, but semantic extraction, review state, and real session exports are not implemented yet.

## Purpose

The API separates the browser from the backend that will own session state, validation, and the OpenAI integration. The frontend will never call OpenAI directly.

The initial contract covers import, GPT-5.6 processing, review mutation, and export. The MVP uses a synchronous import request to keep the first vertical slice small. An asynchronous job model remains a future evolution if processing latency or file volume requires it.

## Session model

- There are no users, authentication, or permanent database records in the MVP.
- Entries belong to a temporary session.
- A future implementation must define how the session identifier is transported; this document does not choose a cookie or header yet.
- The OpenAI API key remains server-side and is never returned by these routes.

## Endpoints

### `POST /imports`

Accepts one or more JSON or Markdown files, performs lightweight technical validation, sends the source content to GPT-5.6 through the backend for semantic interpretation, and returns the extracted entries in `pending` status.

#### Current implementation stage

The current endpoint implements only the deterministic first half of this contract. It receives multipart files, enforces the MVP limits, validates UTF-8 and file extensions, parses JSON syntax, and returns per-file results. It does not call OpenAI or retain source content after the response.

A technically valid source currently has the source status `validated`. This is not an entry review status and does not add to or replace `pending`, `accepted`, `edited`, or `rejected`. Until semantic extraction is implemented, the endpoint returns `entries: []`.

Current response example:

```json
{
  "importId": "import-550e8400-e29b-41d4-a716-446655440000",
  "sources": [
    {
      "file": "fictional-notes.json",
      "format": "json",
      "sizeBytes": 128,
      "status": "validated"
    }
  ],
  "entries": [],
  "errors": []
}
```

`importId` identifies this response but is not persisted or available through a lookup route yet.

#### Request

- Content type: `multipart/form-data`
- File field: `files`
- The field may occur multiple times in one request.
- Accepted extensions: `.json`, `.md`, and `.markdown`.
- The MVP accepts arbitrary readable JSON and Markdown content. Provider-specific adapters are not part of this contract.
- The backend does not require a provider-specific field layout before sending a valid source to GPT-5.6.
- Client-supplied MIME types are not authoritative; the current technical boundary uses the filename extension and validates the actual text content.

#### MVP request limits

For the first synchronous implementation, the backend should enforce these practical limits:

| Limit | MVP value | Reason |
| --- | --- | --- |
| Files per import | 10 | Keeps one request understandable and reviewable. |
| Size per file | 2 MiB | Prevents one source from dominating a synchronous request. |
| Total request size | 10 MiB | Bounds memory use and model-processing cost. |
| Processing time | 120 seconds total | Prevents a request from remaining open indefinitely. |
| Proposed entries | 200 per import | Prevents an unexpectedly large review queue. |

The backend may split a source into internal fragments before calling GPT-5.6, but the user still sees one import result per request. These limits are MVP defaults, not a permanent product promise.

Example request shape (illustrative only; no command is being implemented):

```text
POST /imports
Content-Type: multipart/form-data

files=@conversation-01.json
files=@notes-01.md
```

#### Synchronous behavior

The request remains open while the backend:

1. validates the multipart request, encoding, file type, and size limits;
2. parses JSON syntax when the file is JSON, while treating Markdown as readable text;
3. records the filename and source metadata without requiring a provider-specific structure;
4. prepares a bounded prompt that clearly delimits imported content as data;
5. asks GPT-5.6 through the OpenAI Responses API to interpret the source and produce canonical entries;
6. validates the structured model response and its source references; and
7. returns the proposed entries as `pending`.

The backend does not return a final approved context from this endpoint. Human review is still required.

#### Success response

- Status: `200 OK`
- Content type: `application/json`
- Body:

```json
{
  "importId": "import-001",
  "sources": [
    {
      "file": "conversation-01.json",
      "status": "processed"
    }
  ],
  "entries": [
    {
      "id": "entry-001",
      "type": "fact",
      "content": "The fictional project uses Markdown for weekly reports.",
      "date": {
        "original": null,
        "normalized": null,
        "precision": "unknown",
        "timezone": null
      },
      "status": "pending",
      "sourceReferences": [
        {
          "file": "conversation-01.json",
          "location": "/messages/2/content"
        }
      ]
    }
  ],
  "errors": []
}
```

`importId` is temporary and session-scoped. It is not a persistent identifier.

#### Partial source failures

The response may include successfully processed sources and per-source errors. A source error must identify the file, a stable error code, and a safe human-readable reason without exposing API keys or internal stack traces.

Malformed JSON is reported and skipped; Threadline does not silently ask GPT-5.6 to repair it. Markdown has no equivalent structural parse requirement and is accepted as text when it is readable and within the limits.

The current implementation also reports `invalid_utf8`, `empty_file`, `unsupported_file_type`, and `unexpected_file_field`. If at least one source is valid, these errors are returned alongside the valid sources with `200 OK`. If no source passes validation, the endpoint returns `422 Unprocessable Entity` with `no_valid_sources` and the per-file errors.

Example per-source error:

```json
{
  "file": "broken-export.json",
  "code": "invalid_json",
  "message": "The file is not valid JSON and could not be processed."
}
```

If the request itself is invalid or no source can be processed, the backend returns an error instead of a successful import envelope.

#### Expected errors

- `400 Bad Request`: non-multipart request, no files, or unexpected multipart fields.
- `413 Payload Too Large`: configured file or request limit exceeded.
- `422 Unprocessable Entity`: no supplied source passes technical validation, or later the readable sources contain no extractable conversation content.
- `504 Gateway Timeout`: synchronous processing exceeds the 120-second request limit.
- `502 Bad Gateway`: OpenAI is unavailable or returns a response that fails backend validation.
- `503 Service Unavailable`: the temporary session processor is unavailable.

The route uses the shared `{ "error": { "code", "message" } }` envelope for request-level errors. A `no_valid_sources` response also includes the safe per-file `errors` array.

### `GET /export?format=json`

Returns the current session's approved context as JSON.

#### Query parameters

| Parameter | Allowed values | Required | Meaning |
| --- | --- | --- | --- |
| `format` | `json` | yes | Selects the JSON representation. |

#### Success response

- Status: `200 OK`
- Content type: `application/json`
- Body: a Threadline root export document with `schemaVersion: "threadline.v1"` and only `accepted` or `edited` entries.

```json
{
  "schemaVersion": "threadline.v1",
  "entries": []
}
```

### `GET /export?format=markdown`

Returns the current session's approved context as Markdown.

#### Query parameters

| Parameter | Allowed values | Required | Meaning |
| --- | --- | --- | --- |
| `format` | `markdown` | yes | Selects the Markdown representation. |

#### Success response

- Status: `200 OK`
- Content type: `text/markdown; charset=utf-8`
- Body: a human-readable rendering of the approved entries, retaining source references where possible.

### `POST /entries/:id`

Applies one review decision to an entry in the current session. The route is intentionally small: it does not perform extraction or merge entries.

#### Path parameter

| Parameter | Type | Meaning |
| --- | --- | --- |
| `id` | string | The entry identifier from the canonical schema. |

#### Request body

```json
{
  "status": "edited",
  "content": "Updated fictional context statement."
}
```

Rules:

- `status` is required and must be `accepted`, `edited`, or `rejected`.
- `pending` is an extraction/review state and is not a user decision sent by this route.
- `content` is required when `status` is `edited` and is optional for `accepted` or `rejected`.
- `content` must be a non-empty string when provided.
- The backend preserves the entry's `sourceReferences`.

#### Success response

- Status: `200 OK`
- Content type: `application/json`
- Body: the updated canonical entry.

#### Expected errors

- `400 Bad Request`: invalid status or missing/invalid edited content.
- `404 Not Found`: no entry with that `id` exists in the current session.
- `409 Conflict`: the entry changed between the frontend read and this update.

The route skeleton uses the shared `{ "error": { "code", "message" } }` envelope. Runtime validation details remain pending until temporary review state is implemented.

## Does this cover every user action?

The four routes now cover the MVP flow for a bounded synchronous request:

- `POST /imports` uploads, processes, and returns `pending` entries;
- `POST /entries/:id` accepts, edits, or rejects one entry;
- `GET /export?format=json` exports the approved JSON context; and
- `GET /export?format=markdown` exports the approved Markdown context.

The contract does not yet report live progress while `POST /imports` is running. If processing becomes too slow or imports become large, the future asynchronous version can return `202 Accepted` with a `jobId`, then add a status route such as `GET /imports/:id`. That is deliberately not part of the MVP contract.

## Explicit MVP limits

This contract does not define authentication, persistent storage, streaming, background jobs, provider-specific import adapters, duplicate detection, contradiction resolution, automatic JSON repair, or PAM compatibility. These remain future design topics.
