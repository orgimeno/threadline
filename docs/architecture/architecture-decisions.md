# Initial architecture decisions

> Status: **implemented for the MVP**. The local application supports bounded extraction, temporary review, and export; deployment and evaluation remain future work.

## Summary

| Area | Decision | Status |
| --- | --- | --- |
| Frontend | Vue 3, Vite, and TypeScript | implemented |
| Backend | Node.js, Fastify, and TypeScript | implemented |
| Communication | REST API | implemented |
| Input | `multipart/form-data` | implemented |
| AI | OpenAI Responses API and GPT-5.6 Terra | implemented |
| Persistence | None in the MVP | implemented boundary |
| State | Temporary for the active session | implemented |
| Output | JSON and Markdown | implemented |
| OpenAI API key | Backend only | implemented |
| Docker | Optional when it does not complicate the MVP | planned |

## Frontend: Vue 3, Vite, and TypeScript

The interface is a Vue 3 SPA created with Vite and TypeScript. It supports additive local file selection through the picker or drag and drop, import progress and errors, an entry-by-entry review queue, reopening reviewed entries, and JSON/Markdown downloads. The frontend never handles credentials or calls OpenAI directly.

## Backend: Node.js, Fastify, and TypeScript

The backend uses a Fastify application factory with independently tested routes. It receives files, validates their technical format, prepares bounded model requests, validates structured model responses, keeps temporary review state, and renders exports. Fastify is selected as a lightweight HTTP server with suitable route and validation support.

## Communication and input

The frontend sends multiple files through a REST API using `multipart/form-data`. Import is explicit: the MVP does not connect directly to ChatGPT, Gemini, Claude, or any external account. Sources can be added incrementally and retain their name, type, and fragment locator to preserve traceability.

The implemented technical boundary accepts only the multipart field `files`, with up to 10 files, 2 MiB per file, and 10 MiB per request. It accepts `.json`, `.md`, and `.markdown` filenames, requires valid UTF-8, and checks JSON syntax without requiring a provider-specific layout. MIME headers are not treated as authoritative because they are client-supplied. File contents are held only long enough to validate the request and are not written to disk or persisted.

The frontend now uses the browser's native `fetch` and `FormData` APIs rather than an HTTP client dependency. It validates the response envelope at runtime and represents idle, submitting, success, partial-success, and request-error states with local Vue state. Vite proxies `/api/*` to the backend during development, avoiding a premature production CORS or deployment decision.

## AI: Responses API and GPT-5.6

The backend uses the OpenAI Responses API with `gpt-5.6-terra`. It requests structured JSON containing proposed entries and source references. Model output is never exported directly: the backend validates it against the canonical schema and the interface presents it in `pending` status. The live request uses `store: false`, bounded inputs, a timeout, and one retry.

The key will be read only by the backend process through an environment variable. It will not be exposed in client code, example files, API responses, or the repository.

Before the live model call, the backend now defines separate JSON Schema contracts for model proposals and canonical Threadline documents. Ajv performs runtime structural validation, followed by deterministic checks for dates, time zones, unique identifiers, and locator syntax. The proposal schema excludes backend-owned `id` and `status` fields.

## Parsing boundary and AI responsibility

The backend performs only deterministic technical checks before the model call: file size and type limits, readable UTF-8 text encoding, non-empty content, and JSON syntax parsing for `.json` files. Markdown is treated as readable text and does not need to match a fixed structure. These checks are now implemented. The backend preserves filenames and source metadata but does not require ChatGPT, Gemini, Claude, or another provider's export layout.

GPT-5.6 is responsible for semantic interpretation of heterogeneous source content. It identifies useful messages or passages, classifies context, normalizes dates when evidence supports it, and returns entries that match Threadline's canonical schema. The backend then validates the model response and verifies its source references before the frontend shows the entries as `pending`.

Validated content remains available only inside the backend request lifecycle. The extraction preparer creates one internal envelope per source: original JSON text with a JSON Pointer strategy, or Markdown text annotated with one-based line numbers. Public validation responses contain only source summaries and never include conversation content. Oversized sources fail within the documented bounded-input budget; richer chunking is a future enhancement.

Malformed JSON is reported per file with a stable error code and human-readable reason. Threadline does not silently repair malformed JSON through the model, because doing so could break provenance. Automatic repair may be considered as a separate, explicitly reviewed feature later.

For generic provenance, valid JSON uses JSON Pointer locations and Markdown uses one-based line ranges. This generic source map is deliberately different from a provider-specific import adapter. The model proposes source references; the backend verifies them, then assigns temporary entry identifiers and `pending` status.

## Persistence and state

The MVP does not include a database or permanent storage. Imported files, intermediate results, and review decisions will exist temporarily during the active session. A browser reload or session expiry may lose pending work; the implemented interface must communicate this behavior.

## Output

The consolidated context can be exported as JSON and Markdown. It will include only `accepted` and `edited` entries; `rejected` entries will not be part of the output. Each entry will retain source-file references when the output format supports them.

## Docker

Docker is not required for the first implementation. It can be added for reproducibility once there are real services and commands to containerize, provided it does not delay or complicate the MVP.

## Consequences and pending decisions

- The canonical entry schema and source-location rules are implemented through runtime schemas and validation.
- Initial file and request limits, timeout, and retry behavior are implemented; richer chunking remains future work.
- The lack of persistence reduces complexity, but requires a clear notice about session lifetime.
- Provider-specific export formats are a future evolution; the MVP accepts generic JSON and Markdown.
