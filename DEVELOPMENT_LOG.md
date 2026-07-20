# Development log

This log records product and technical decisions. Valid statuses are `planned`, `in progress`, and `implemented`.

## 2026-07-20 — Improve review feedback and editable date metadata

- **Problem/question:** How can the review queue make long extraction waits and review actions feel responsive, and how can a user correct an entry that has no extracted date?
- **Decision:** show an explicit processing indicator while import/extraction is pending, add short accept/edit/reject feedback before advancing the queue, and let edited entries update date metadata through the existing canonical `date` object.
- **Reason:** the MVP must remain understandable during slow model calls, and users need a controlled way to correct missing dates without adding edit history or changing the canonical schema.
- **Codex contribution:** implemented the frontend interaction, extended the review API to accept validated date metadata for edited entries, and added regression tests for the UI, API client, and temporary session store.
- **Pending:** run a manual browser pass with fictional sources and decide whether the demo extractor should produce richer synthetic entries for judges.

## 2026-07-20 — Make live extraction stateless and model configuration explicit

- **Problem/question:** How can Threadline prevent Responses API application-state retention and make it unambiguous that the configured model overrides the fallback?
- **Decision:** send `store: false` on the single Responses API call site, resolve `OPENAI_MODEL` before constructing the extractor, and use `gpt-5.6-terra` only when the environment value is missing or blank.
- **Reason:** imported conversations can contain personal context, and runtime configuration must remain predictable and auditable.
- **Codex contribution:** reviewed the user-provided privacy change, clarified that extraction and structured output occur in one request per source, refactored model resolution, and added regression coverage for both behaviors.
- **Pending:** decide whether a future bring-your-own-key flow should be local-only or accept an ephemeral key through a hardened backend session; no browser key flow is implemented.

## 2026-07-20 — Finish the hackathon-ready MVP and judge path

- **Problem/question:** What is the smallest complete product loop that remains easy to judge without sharing a private API key?
- **Decision:** complete live bounded extraction, temporary review, JSON/Markdown export, a review navigator, and a deterministic `DEMO_MODE` that exercises the same browser-to-backend workflow without contacting OpenAI.
- **Reason:** judges can test the product immediately, while the real path still demonstrates GPT-5.6 Terra structured extraction, provenance verification, timeout/retry behavior, and human control.
- **Implementation:** added local `.env` loading, OpenAI quota-safe error reporting, 12k/24k estimated input budgets, one retry and 60-second timeout, in-memory review decisions, export rendering, judge quick-start documentation, and a polished review UI with progress and navigation.
- **Verification:** typecheck, 33 automated tests, production builds, manual live extraction, review, and both export formats were run during development.
- **Pending:** prepare a short public demo video, a small synthetic evaluation set, and Devpost submission copy/screenshots.

## 2026-07-19 — Complete the bounded import-to-export MVP flow

- **Decision:** connect bounded OpenAI extraction to a temporary in-memory review session and export approved entries as JSON or Markdown.
- **Reason:** it completes the user-visible product loop without adding accounts, a database, background jobs, or provider-specific adapters.
- **Implementation:** the backend enforces estimated token budgets, uses a timeout and one retry, validates structured proposals and source locators, then assigns pending entries. The Vue client supports accept, edit, reject, and both downloads.
- **Pending:** add a small synthetic evaluation set and hackathon presentation polish.

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

## 2026-07-18 — Define the canonical context schema

- **Problem/question:** What is the smallest stable representation that can travel from extraction to review and final export?
- **Options considered:** keep only free text; add a large memory model with histories, hashes, embeddings, and relationships; define a focused entry contract with provenance and review state.
- **Decision:** use `id`, `type`, `content`, `date`, `status`, and `sourceReferences` for every entry, with a root `schemaVersion` value of `threadline.v1`. Dates preserve their original expression and may remain unnormalized. The status vocabulary is `pending`, `accepted`, `edited`, and `rejected`.
- **Reason:** this covers the MVP workflow without over-designing a permanent memory system. Source references provide traceability, while edit history and `originalContent` are intentionally excluded.
- **Codex contribution:** compared the proposed fields, challenged unnecessary additions, and documented the agreed contract before any implementation work.
- **Pending:** validate the contract against representative JSON and Markdown import cases, then define the API boundary around it.

## 2026-07-18 — Add time precision and the first API boundary

- **Problem/question:** How should entries represent events that include hours and minutes, and what is the smallest useful frontend/backend contract?
- **Options considered:** keep date-only precision; add a generic `exact` value; add explicit `hour` and `minute` precision plus an optional time zone.
- **Decision:** use `minute`, `hour`, `day`, `month`, `year`, and `unknown` precision values. Add `timezone` as a nullable IANA time-zone name. Do not assume UTC or invent a time zone. Document `GET /export?format=json`, `GET /export?format=markdown`, and `POST /entries/:id` as the initial boundary.
- **Reason:** explicit precision preserves evidence without pretending to know more than the source provides. The three routes cover review mutation and export while leaving import and model processing open for deliberate design.
- **Codex contribution:** evaluated the time-zone trade-off, kept the API surface intentionally small, and documented the missing import/processing boundary instead of silently adding routes.
- **Pending:** review the contract, then design the import-to-extraction request and response shape.

## 2026-07-18 — Choose synchronous import processing for the MVP

- **Problem/question:** Should file import and GPT-5.6 extraction return immediately with a job identifier, or keep the request open until entries are ready?
- **Options considered:** synchronous `POST /imports` returning `pending` entries; asynchronous `202 Accepted` with a job identifier and a polling endpoint; a streaming protocol.
- **Decision:** use synchronous `POST /imports` for the MVP. It accepts repeated `files` fields in `multipart/form-data`, processes bounded imports, and returns source results, `pending` entries, and per-source errors in one response.
- **Reason:** the first vertical slice should minimize moving parts and make the flow easy to observe. A job queue, polling, and progress protocol would add infrastructure before we know that latency requires them.
- **Codex contribution:** explained the sync/async trade-off, added the import contract, and documented the future asynchronous extension without implementing it.
- **Pending:** choose practical file and request limits, then define the exact generic JSON/Markdown source parser behavior.

## 2026-07-18 — Set practical synchronous import limits

- **Problem/question:** What limits keep a synchronous MVP import predictable without making ordinary multi-file use frustrating?
- **Options considered:** no limits; very small single-file imports; bounded multi-file imports with a request timeout and an entry cap.
- **Decision:** allow up to 10 files, 2 MiB per file, 10 MiB per request, 200 proposed entries, and 120 seconds of total synchronous processing time. Process sources sequentially and allow internal source chunking.
- **Reason:** these defaults bound memory, latency, review-queue size, and model cost while still supporting a normal small export set. They can be measured and revised once the first implementation exists.
- **Codex contribution:** selected and documented the limits as an MVP operating contract instead of leaving them implicit.
- **Pending:** define the generic JSON/Markdown parser behavior and the exact chunking strategy.

## 2026-07-18 — Delegate heterogeneous source interpretation to GPT-5.6

- **Problem/question:** How can Threadline accept unknown JSON layouts and Markdown exports without building provider-specific adapters first?
- **Options considered:** require a fixed normalized input format; create adapters for every provider; perform only technical checks in the backend and delegate semantic interpretation to GPT-5.6.
- **Decision:** the backend checks encoding, file limits, file type, and JSON syntax, then preserves source metadata and sends readable content to GPT-5.6. The model interprets the source and returns canonical entries. Malformed JSON is skipped and reported per file with a reason; it is not silently repaired.
- **Reason:** provider exports are heterogeneous, and the product's value is acting as an intermediary, prompt boundary, and human-review editor rather than requiring a universal input schema.
- **Codex contribution:** corrected the earlier assumption that the backend should normalize provider-specific structures and aligned the API, architecture, and README descriptions.
- **Pending:** define the prompt boundary and source-location strategy for model output without implementing the processing flow yet.

## 2026-07-18 — Define generic extraction provenance and prompt boundary

- **Problem/question:** How can GPT-5.6 interpret arbitrary valid JSON and Markdown while Threadline still verifies where each proposal came from?
- **Options considered:** provider-specific adapters; unverified model-written locations; generic source locators that the backend can validate.
- **Decision:** use JSON Pointer locations for valid JSON and one-based line ranges for Markdown. The backend supplies metadata and untrusted source content, GPT-5.6 proposes `type`, `content`, `date`, and `sourceReferences`, and the backend verifies locators before assigning `id` and `pending` status.
- **Reason:** this preserves the product's general-input promise without giving up traceability or relying on the model to make final state decisions.
- **Codex contribution:** selected a provider-neutral locator strategy and documented the model input boundary, output responsibility, and privacy disclosure.
- **Pending:** create the application skeleton and translate these contracts into runtime types and validation.

## 2026-07-18 — Create the first executable application skeleton

- **Problem/question:** How can implementation begin without prematurely coupling file upload, review state, and OpenAI extraction?
- **Options considered:** implement the entire vertical slice immediately; create independent frontend and backend repositories; create a small npm workspace with explicit unimplemented boundaries.
- **Decision:** use one npm workspace with `frontend` and `backend` packages on Node.js 22. The frontend provides the first Vue application shell and local file selection. The backend uses a Fastify application factory, a health route, placeholder import and review routes, and empty export responses. Import and review placeholders return explicit `501 Not Implemented` responses rather than simulating finished behavior.
- **Reason:** the workspace can now be run, tested, and extended one boundary at a time while preserving the documented contracts and truthful implementation status.
- **Codex contribution:** created the package structure, application shells, route and component tests, root development commands, and current-state documentation; then verified type checking, tests, and production builds.
- **Pending:** implement multipart parsing and technical source validation without calling OpenAI, then define temporary session state before enabling review mutations and real exports.

## 2026-07-18 — Implement the local import validation boundary

- **Problem/question:** What useful part of `POST /imports` can be implemented before introducing model calls or temporary session state?
- **Options considered:** keep returning `501 Not Implemented`; connect OpenAI immediately; implement deterministic multipart and source validation first.
- **Decision:** accept only the repeated multipart field `files`; enforce 10 files, 2 MiB per file, and 10 MiB per request; require `.json`, `.md`, or `.markdown` filenames and valid UTF-8; reject empty files; parse JSON syntax without assuming a provider layout; and return valid sources plus safe per-file errors. Valid sources use the temporary source status `validated`, while `entries` remains empty.
- **Reason:** this creates a real, testable frontend/backend boundary while keeping semantic interpretation and human-review state separate. Partial success lets one malformed source fail without discarding other valid imports.
- **Codex contribution:** implemented the Fastify multipart boundary, pure source validation, stable request and per-file errors, request limits, and route tests for successful, partial, invalid, and oversized imports.
- **Pending:** connect the frontend to this endpoint, display source validation results, and then define the runtime extraction schema before calling GPT-5.6.

## 2026-07-18 — Connect the frontend to technical import validation

- **Problem/question:** How should the Vue interface call the first backend boundary without introducing an HTTP library, global state, or a production deployment decision?
- **Options considered:** add Axios and a state store; call Fastify directly with CORS enabled; use native `fetch` and `FormData` with a Vite development proxy.
- **Decision:** use a small typed import client built on `fetch`, submit every selected file through the repeated `files` field, validate successful and error envelopes at runtime, and keep request state local to the application component. In development, Vite rewrites `/api/imports` to the backend `/imports` route.
- **Reason:** this completes the first real browser-to-backend flow with no unnecessary dependencies. The proxy keeps local development simple while leaving production routing open until deployment is chosen.
- **Codex contribution:** implemented the import client, proxy configuration, loading and retry behavior, total and partial validation result views, safe backend-unreachable handling, and automated client and component tests.
- **Pending:** perform a manual browser and HTTP-client review, then define the runtime extraction schema and OpenAI request preparation without yet enabling irreversible review or export behavior.

## 2026-07-18 — Implement canonical and extraction-proposal runtime schemas

- **Problem/question:** How can Threadline validate future model output without letting GPT-5.6 assign identifiers or review decisions?
- **Options considered:** trust TypeScript types only; use one schema containing every canonical field; define separate runtime contracts for model proposals and backend-owned canonical documents.
- **Decision:** define shared TypeScript domain types plus two strict JSON Schema documents. The extraction proposal contains `type`, `content`, `date`, and `sourceReferences`, while the canonical document adds backend-owned `id`, `status`, and `schemaVersion`. Ajv handles structural validation, followed by semantic checks for real calendar values, precision, original date evidence, recognized time zones, unique identifiers, and locator syntax.
- **Reason:** external model output is untrusted at runtime. Separating proposal fields from backend-owned fields preserves the human-review boundary and makes the future structured-output request explicit and testable.
- **Codex contribution:** implemented the domain types, reusable schemas, validators, empty canonical export factory, and tests covering valid documents, invalid dates, invalid provenance, duplicate identifiers, unknown states, and model attempts to set backend-owned fields.
- **Pending:** manually review the current import flow, then prepare bounded source payloads and the extraction instruction before enabling the OpenAI call.

## 2026-07-18 — Prepare extraction requests without calling OpenAI

- **Problem/question:** How should validated source text cross the future model boundary without leaking it to the frontend or losing generic provenance?
- **Options considered:** return decoded content to the browser; combine every source into one prompt; prepare one backend-only extraction envelope per validated source.
- **Decision:** retain decoded content only inside the backend request lifecycle and prepare one deterministic envelope per source. JSON text remains unchanged with a `json-pointer` locator strategy; Markdown receives one-based display line numbers with a `markdown-line-range` strategy. Every envelope carries the fixed untrusted-data instruction and strict extraction-proposal schema.
- **Reason:** per-source envelopes preserve filenames and locator semantics, keep processing sequential, isolate prompt-injection defenses from imported content, and prevent private conversation text from entering technical validation responses.
- **Codex contribution:** separated internal validated content from public source summaries, implemented extraction request preparation and Markdown line numbering, and added tests for deterministic source identifiers, strict schema attachment, instruction boundaries, and absence of source content in HTTP responses.
- **Pending:** choose and implement a token-aware chunking budget, translate envelopes to the OpenAI Responses API, add retries and evaluations, and perform the planned manual browser and HTTP-client review.

## 2026-07-18 — Define a repeatable manual import review

- **Problem/question:** How can the current browser-to-backend boundary be reviewed consistently outside automated tests?
- **Options considered:** rely on ad hoc terminal commands; add private real exports; document safe checks using fictional and temporary synthetic sources.
- **Decision:** provide one manual guide covering browser behavior, direct backend and Vite-proxy curl requests, Postman multipart configuration, VS Code review points, partial failure, complete failure, and file-size rejection.
- **Reason:** repeatable manual checks make UI and HTTP behavior visible without adding private fixtures or pretending that automated component tests replace human inspection.
- **Codex contribution:** documented exact startup commands, expected responses, safe temporary fixtures, review boundaries, and a completion checklist.
- **Pending:** execute the guide with the project owner and record any usability or contract changes discovered during the review.
