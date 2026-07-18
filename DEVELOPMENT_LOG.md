# Development log

This log records product and technical decisions. Valid statuses are `planned`, `in progress`, and `implemented`.

## 2026-07-18 — Define the MVP boundary

- **Problem/question:** How can mixed AI conversation exports become useful context without automating a decision that must remain human?
- **Options considered:** export one final summary directly; extract structured entries and review them; store a permanent history from the start.
- **Decision:** extract proposed structured entries and present them in a review queue with `pending`, `accepted`, `edited`, and `rejected` states. Final context will include only accepted and edited entries.
- **Reason:** this preserves traceability, lets people correct model errors, and prevents ambiguous content from becoming final context without confirmation.
- **Codex contribution:** translated the need into a reviewable workflow and documented the MVP boundary.
- **Pending:** define the canonical entry schema and consolidation rules.

## 2026-07-18 — Initial architecture

- **Problem/question:** Which architecture supports a focused web MVP while keeping the OpenAI API key secure?
- **Options considered:** a frontend that calls OpenAI directly; Node.js with Express; Node.js with Fastify; managed services and persistence from the start.
- **Decision:** use Vue 3 + Vite + TypeScript for the frontend and Node.js + TypeScript + Fastify for the backend, connected through a REST API.
- **Reason:** it separates the interface from processing logic, keeps the key on the server, and limits the first release scope.
- **Codex contribution:** inspected the initial repository, proposed the responsibility boundary, and recorded the architecture decision.
- **Pending:** create package structure, API contracts, and tests.

## 2026-07-18 — Import and temporary state

- **Problem/question:** How can the product accept several exports without introducing a database before the workflow is validated?
- **Options considered:** persist files and results in a database; keep everything only in the browser; process and keep session state in memory.
- **Decision:** accept `multipart/form-data` and keep imported files, results, and review decisions temporarily for the active session. The MVP will not have persistent storage.
- **Reason:** this supports the import and review workflow while limiting complexity and data exposure.
- **Codex contribution:** identified state loss after a reload as behavior that must be clearly communicated.
- **Pending:** define file limits, session lifetime, and cleanup policy.

## 2026-07-18 — Extraction with OpenAI

- **Problem/question:** How can heterogeneous JSON and Markdown sources produce consistent, traceable data?
- **Options considered:** a free-text summary; local rules only; the Responses API with structured JSON output.
- **Decision:** the backend will prepare normalized content and source references for GPT-5.6 through the OpenAI Responses API, requesting structured JSON. The backend will validate the response before exposing it to the frontend.
- **Reason:** structured outputs support validation and a review interface; traceability is not delegated to the model without backend checks.
- **Codex contribution:** verified that GPT-5.6 supports the Responses API and structured outputs, and documented the API-key security boundary.
- **Pending:** define the JSON Schema, extraction prompt, error handling, retries, and evaluation with synthetic examples.

## 2026-07-18 — Docker is optional, not a requirement

- **Problem/question:** Should Docker be added in the first product commit?
- **Options considered:** mandatory Docker; optional Docker later; local execution without a container.
- **Decision:** Docker remains an optional reproducibility tool and will not be added if it unnecessarily complicates the MVP.
- **Reason:** validate the user workflow before expanding infrastructure.
- **Codex contribution:** included this condition in the architecture decisions and README.
- **Pending:** revisit when real services and commands exist.
