# Initial architecture decisions

> Status: **in progress**. The framework structure and technical import validation are implemented; frontend integration, session state, review, export, and OpenAI processing remain incomplete.

## Summary

| Area | Decision | Status |
| --- | --- | --- |
| Frontend | Vue 3, Vite, and TypeScript | in progress |
| Backend | Node.js, Fastify, and TypeScript | in progress |
| Communication | REST API | in progress |
| Input | `multipart/form-data` | in progress |
| AI | OpenAI Responses API and GPT-5.6 | planned |
| Persistence | None in the MVP | planned |
| State | Temporary for the active session | planned |
| Output | JSON and Markdown | in progress |
| OpenAI API key | Backend only | planned |
| Docker | Optional when it does not complicate the MVP | planned |

## Frontend: Vue 3, Vite, and TypeScript

The interface is a Vue 3 SPA created with Vite and TypeScript. Its current shell supports local file selection and displays the planned workflow. Its next responsibilities are sending files, showing processing results, and supporting individual entry review. The frontend will not handle credentials or call OpenAI directly.

## Backend: Node.js, Fastify, and TypeScript

The backend skeleton uses a Fastify application factory with independently tested routes. It will receive files, detect and validate their format, prepare model requests, and validate model responses. Fastify is selected as a lightweight HTTP server with suitable route and validation support. Shared runtime models may be introduced after the first concrete validation boundary exists.

## Communication and input

The frontend will send multiple files through a REST API using `multipart/form-data`. Import is explicit: the MVP will not connect directly to ChatGPT, Gemini, Claude, or any external account. Each source will receive a temporary identifier and retain at least its name, type, and fragment locator to preserve traceability.

The implemented technical boundary accepts only the multipart field `files`, with up to 10 files, 2 MiB per file, and 10 MiB per request. It accepts `.json`, `.md`, and `.markdown` filenames, requires valid UTF-8, and checks JSON syntax without requiring a provider-specific layout. MIME headers are not treated as authoritative because they are client-supplied. File contents are held only long enough to validate the request and are not written to disk or persisted.

The frontend now uses the browser's native `fetch` and `FormData` APIs rather than an HTTP client dependency. It validates the response envelope at runtime and represents idle, submitting, success, partial-success, and request-error states with local Vue state. Vite proxies `/api/*` to the backend during development, avoiding a premature production CORS or deployment decision.

## AI: Responses API and GPT-5.6

The backend will use the OpenAI Responses API with `gpt-5.6`. It will request structured JSON containing proposed entries and source references. Model output will never be exported directly: the backend will validate it against the canonical schema and the interface will present it in `pending` status.

The key will be read only by the backend process through an environment variable. It will not be exposed in client code, example files, API responses, or the repository.

## Parsing boundary and AI responsibility

The backend performs only deterministic technical checks before the model call: file size and type limits, readable UTF-8 text encoding, non-empty content, and JSON syntax parsing for `.json` files. Markdown is treated as readable text and does not need to match a fixed structure. These checks are now implemented. The backend preserves filenames and source metadata but does not require ChatGPT, Gemini, Claude, or another provider's export layout.

GPT-5.6 is responsible for semantic interpretation of heterogeneous source content. It identifies useful messages or passages, classifies context, normalizes dates when evidence supports it, and returns entries that match Threadline's canonical schema. The backend then validates the model response and verifies its source references before the frontend shows the entries as `pending`.

Malformed JSON is reported per file with a stable error code and human-readable reason. Threadline does not silently repair malformed JSON through the model, because doing so could break provenance. Automatic repair may be considered as a separate, explicitly reviewed feature later.

For generic provenance, valid JSON uses JSON Pointer locations and Markdown uses one-based line ranges. This generic source map is deliberately different from a provider-specific import adapter. The model proposes source references; the backend verifies them, then assigns temporary entry identifiers and `pending` status.

## Persistence and state

The MVP does not include a database or permanent storage. Imported files, intermediate results, and review decisions will exist temporarily during the active session. A browser reload or session expiry may lose pending work; the implemented interface must communicate this behavior.

## Output

The consolidated context can be exported as JSON and Markdown. It will include only `accepted` and `edited` entries; `rejected` entries will not be part of the output. Each entry will retain source-file references when the output format supports them.

## Docker

Docker is not required for the first implementation. It can be added for reproducibility once there are real services and commands to containerize, provided it does not delay or complicate the MVP.

## Consequences and pending decisions

- The canonical entry schema and source-location rules are defined; runtime schemas remain to be implemented.
- Initial file and request limits are defined; chunking details and retry behavior must be decided before the live model call is integrated.
- The lack of persistence reduces complexity, but requires a clear notice about session lifetime.
- Provider-specific export formats are a future evolution; the MVP accepts generic JSON and Markdown.
