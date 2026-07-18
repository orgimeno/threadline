# Threadline

> Project status: **planned**. This branch contains the documentation foundation and fictional examples; the application has not been implemented yet.

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

## Planned architecture

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

## Proposed stack

| Layer | Technology | Status |
| --- | --- | --- |
| Frontend | Vue 3, Vite, and TypeScript | planned |
| Backend | Node.js, Fastify, and TypeScript | planned |
| API | REST with `multipart/form-data` for imports | planned |
| AI | OpenAI Responses API with GPT-5.6 | planned |
| State | Temporary for the active session | planned |
| Export | JSON and Markdown | planned |
| Docker | Optional, only if it improves reproducibility without slowing the MVP | planned |

## How Codex contributed

Codex helped inspect the repository, define the MVP boundary, document the first decisions, and design the processing and review flow. This contribution is recorded in [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md). Codex does not replace human review: the product is designed so the user confirms, changes, or discards every extracted entry.

## Fictional examples

The files in [examples/sample-input](examples/sample-input) and [examples/sample-output](examples/sample-output) are entirely fictional. They contain no real conversation exports or personal data, and illustrate mixed input and consolidated final context.

## Running the project when code exists

There is no runnable application code or installed dependency yet. Once the frontend and backend exist, this section will document prerequisites, environment variables (including `OPENAI_API_KEY` for the backend only), and development commands. Those commands must not be assumed to exist today.

## Implementation status and next steps

| Area | Status | Notes |
| --- | --- | --- |
| Product and architecture documentation | implemented | This documentation foundation is complete for the current phase. |
| Fictional examples | implemented | Reference input and output files are included. |
| Canonical entry schema | implemented | The MVP contract is documented; runtime validation remains planned. |
| Frontend and backend | planned | They will be built after the architecture is validated. |
| Live OpenAI call | planned | It requires a backend, schema, and secure configuration. |
| Review and export | planned | They require an interface and temporary session state. |

Before implementation begins, the team must finalize the entry schema, file and chunking limits, session-reload behavior, and the first supported input formats.
