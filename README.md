# Threadline

> Project status: **in progress**. The temporary-session MVP flow is implemented: import, bounded OpenAI extraction, human review, and JSON/Markdown export.

Threadline is a web application that turns unstructured exports of AI conversations into structured, traceable context that a person can review.

## Judge quick start

Threadline can be evaluated without an OpenAI API key or paid account. From the repository root:

```bash
nvm use
npm install
cp backend/.env.example backend/.env
```

Set `DEMO_MODE=true` in `backend/.env`, then run the frontend and backend in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Open the frontend URL, import either fictional file in `examples/sample-input`, review the generated demo proposal, and export JSON or Markdown. Demo mode is deterministic and never contacts OpenAI. Set `DEMO_MODE=false` and add `OPENAI_API_KEY` to use the live GPT-5.6 Terra extraction path.

## Hackathon implementation

Threadline fits the **Apps for Your Life** track: it makes a person's useful AI context portable without removing their control. Codex accelerated the product definition, architecture, schemas, test coverage, review interface, and documentation; dated decisions and implementation milestones are recorded in `DEVELOPMENT_LOG.md`. GPT-5.6 Terra performs the live, structured interpretation of heterogeneous JSON and Markdown sources. The backend—not the model—validates output, assigns review state, verifies source locators, and constructs exports.

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

## GPT-5.6 integration

The backend calls the Responses API with `gpt-5.6-terra` and a structured-output schema. Each request contains readable source content and source metadata; the model returns proposals, never irreversible final context. The backend validates the schema and locators, associates proposals with sources, and places each proposal in `pending` status for human review.

The live path uses bounded inputs, a 60-second timeout, one SDK retry, and safe errors. See the [GPT-5.6 model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

## Stack

| Layer | Technology | Status |
| --- | --- | --- |
| Frontend | Vue 3, Vite, and TypeScript | in progress |
| Backend | Node.js, Fastify, and TypeScript | in progress |
| API | REST with `multipart/form-data` for imports | in progress |
| AI | OpenAI Responses API with GPT-5.6 Terra | implemented |
| State | Temporary in-memory session | implemented |
| Export | JSON and Markdown | implemented |
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
- `POST /imports` validates sources, extracts bounded proposals, and returns pending entries.
- `POST /entries/:id` accepts, edits, or rejects a session entry.
- `GET /export?format=json` and `GET /export?format=markdown` export approved entries.

Run all current checks from the repository root:

```bash
npm run typecheck
npm test
npm run build
```

Copy `backend/.env.example` to `backend/.env` and set `OPENAI_API_KEY`. The backend reads it locally and Git ignores the real `.env` file.

The repeatable browser, curl, Postman, and VS Code review procedure is documented in [docs/testing/manual-import-validation.md](docs/testing/manual-import-validation.md).

## Implementation status and next steps

| Area | Status | Notes |
| --- | --- | --- |
| Product and architecture documentation | implemented | This documentation foundation is complete for the current phase. |
| Fictional examples | implemented | Reference input and output files are included. |
| Canonical entry schema | implemented | TypeScript types, JSON Schema, and runtime structural and semantic validation exist. |
| Model proposal schema | implemented | The bounded proposal excludes backend-owned `id` and `status`; live responses are validated. |
| Extraction request preparation | implemented | Bounded envelopes, locator strategies, the OpenAI adapter, timeout, and retry are connected. |
| Frontend import flow | implemented | Import, review navigator, decisions, and downloads are connected. |
| Backend import boundary | implemented | Validation, extraction, provenance checks, and temporary session state are connected. |
| Automated checks | implemented | Frontend component tests, backend route tests, type checking, and production builds run through root npm scripts. |
| Live OpenAI call | implemented | Backend-only key, bounded inputs, retry, timeout, and safe errors. |
| Review and export | implemented | Temporary in-memory decisions and JSON/Markdown downloads. |

The next step is a manual end-to-end review with fictional sources, then a small evaluation set and presentation polish for the hackathon.
