# Threadline

> Project status: **in progress**. The frontend can now send selected files to the backend and display bounded technical validation results for multipart JSON and Markdown imports. Semantic extraction, the review workflow, session state, and the OpenAI integration remain planned.

Threadline is a web application that turns unstructured exports of AI conversations into structured, traceable context that a person can review.

## The problem

Useful personal context is often spread across conversations exported from ChatGPT, Gemini, Claude, and other tools. When those exports are brought together, they contain repetitions, conflicting facts, inconsistent dates, and different kinds of information. Copying that material into a new assistant is slow and makes it difficult to know where each claim came from.

Threadline offers a different workflow: import individual files, extract candidate context entries with AI, review every proposal, and export only the context the person approves.

## Main workflow

1. The user imports multiple JSON or Markdown files.
2. The frontend sends the files to the backend with `multipart/form-data`.
3. The backend performs lightweight technical validation and keeps each source reference.
4. The backend sends heterogeneous source content to GPT-5.6 for semantic interpretation and structured JSON extraction.
5. The backend validates and consolidates the proposed entries.
6. The frontend presents a review queue. The user can accept, edit, or reject each entry.
7. Threadline builds the final context from accepted and edited entries.
8. The user previews and exports it as JSON or Markdown; the export can become input for a later import cycle.

The planned diagram is available at [docs/architecture/threadline-flow.mmd](docs/architecture/threadline-flow.mmd).

The canonical context contract is documented in [docs/architecture/canonical-schema.md](docs/architecture/canonical-schema.md). The MVP export root uses `schemaVersion: "threadline.v1"`; entries use the controlled types and review states described there.

The planned extraction boundary is documented in [docs/architecture/extraction-contract.md](docs/architecture/extraction-contract.md). It explains how Threadline can interpret arbitrary valid JSON and Markdown without provider-specific adapters while preserving source traceability.

## MVP scope

The MVP includes the web application, multi-file JSON and Markdown import, per-source processing, structured extraction with GPT-5.6, response validation, entry-by-entry review, and JSON/Markdown export with source references.

It does not include user accounts, authentication, a permanent database, direct provider integrations, automatic synchronization, a native mobile app, offline PWA support, a vector database, advanced semantic search, or topic-specific subcontexts. See [docs/product/mvp-scope.md](docs/product/mvp-scope.md) for the full boundary.

## Architecture

```text
Vue 3 + Vite + TypeScript
          |  multipart/form-data
          v
Node.js + Fastify + TypeScript
  - validates and normalizes sources
  - prepares traceable fragments
  - calls OpenAI
  - validates and consolidates responses
          |  structured JSON
          v
Responses API + GPT-5.6
```

Communication will use a REST API. Files and state will exist only during the initial session: the MVP has no persistent storage. The OpenAI API key will remain exclusively on the backend, never in the browser. The rationale is documented in [docs/architecture/architecture-decisions.md](docs/architecture/architecture-decisions.md).

## Planned GPT-5.6 integration

The backend will call the Responses API with `gpt-5.6` and a structured-output schema. Each request will contain readable source content and source metadata; the model will interpret heterogeneous JSON or Markdown and return proposed entries, not irreversible final context. After the call, the backend will validate the schema, associate proposals with their sources, and place each proposal in `pending` status for human review.

This design uses the GPT-5.6 family's support for the Responses API and structured outputs, but remains **planned** until it is implemented and tested. See the [GPT-5.6 model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

## Stack

| Layer | Technology | Status |
| --- | --- | --- |
| Frontend | Vue 3, Vite, and TypeScript | in progress |
| Backend | Node.js, Fastify, and TypeScript | in progress |
| API | REST with `multipart/form-data` for imports | in progress |
| AI | OpenAI Responses API with GPT-5.6 | planned |
| State | Temporary for the active session | planned |
| Export | JSON and Markdown | planned |
| Docker | Optional, only if it improves reproducibility without slowing the MVP | planned |

## How Codex contributed

Codex helped inspect the repository, define the MVP boundary, document the first decisions, and design the processing and review flow. This contribution is recorded in [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md). Codex does not replace human review: the product is designed so the user confirms, changes, or discards every extracted entry.

## Fictional examples

The files in [examples/sample-input](examples/sample-input) and [examples/sample-output](examples/sample-output) are entirely fictional. They contain no real conversation exports or personal data, and illustrate mixed input and consolidated final context.

## Running the current skeleton

Prerequisites:

- Node.js 22 (the repository includes an `.nvmrc` file)
- npm 10 or later

Install both workspaces from the repository root:

```bash
nvm use
npm install
```

Run the frontend and backend in separate terminals:

```bash
npm run dev:frontend
npm run dev:backend
```

The frontend development server prints its local URL. During local development, Vite proxies browser requests from `/api/*` to the backend at `http://localhost:3000/*`. The backend currently exposes these routes:

- `GET /health` returns a service health response.
- `POST /imports` validates bounded multipart JSON and Markdown sources and reports per-file results. It does not perform semantic extraction yet.
- `POST /entries/:id` returns `501 Not Implemented` until temporary review state exists.
- `GET /export?format=json` and `GET /export?format=markdown` return empty placeholder exports.

Run all current checks from the repository root:

```bash
npm run typecheck
npm test
npm run build
```

No `OPENAI_API_KEY` is needed yet because no OpenAI call has been implemented. When that integration is added, the key will be read by the backend only.

## Implementation status and next steps

| Area | Status | Notes |
| --- | --- | --- |
| Product and architecture documentation | implemented | This documentation foundation is complete for the current phase. |
| Fictional examples | implemented | Reference input and output files are included. |
| Canonical entry schema | implemented | The MVP contract is documented; runtime validation remains planned. |
| Frontend import flow | in progress | File selection, multipart submission, loading/error states, and per-file validation results are connected. Extraction remains planned. |
| Backend import boundary | in progress | Multipart limits, UTF-8 decoding, extension checks, JSON syntax validation, and per-file results are implemented. Extraction remains planned. |
| Automated checks | implemented | Frontend component tests, backend route tests, type checking, and production builds run through root npm scripts. |
| Live OpenAI call | planned | It requires a backend, schema, and secure configuration. |
| Review and export | planned | They require an interface and temporary session state. |

The next step is a manual end-to-end review in the browser and with an HTTP client such as `curl` or Postman. After that validation, the next implementation block is the runtime extraction schema and bounded OpenAI request preparation. The extraction prompt, retries, and evaluations remain deliberate decisions before the live integration.
