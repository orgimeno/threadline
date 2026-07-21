## Inspiration

Threadline started with a personal problem: useful context was scattered across too many AI conversations.

Some information lived in ChatGPT, some in Gemini or Claude, and some in JSON exports or Markdown notes. The first context files I made were useful, but they were also mixed, repetitive, inconsistently dated, and difficult to trust as one source of truth.

I could paste everything into a new conversation and ask for a summary. That can work once, but it is not a repeatable workflow and gives the user very little control over what is preserved, changed, or discarded.

Threadline turns that messy collection of exports into structured, traceable context that a person reviews before it becomes final.

## What it does

Threadline is a web application that imports multiple JSON and Markdown conversation exports.

For each valid source, the backend uses GPT-5.6 through the OpenAI Responses API to propose structured context entries. Threadline then validates the response, preserves source references, and places the entries in a review queue instead of presenting one opaque generated summary.

The reviewer can:

- **Accept** an entry and keep it in the final context.
- **Edit** its wording before keeping it.
- **Reject** it and exclude it from the final context.
- **Reopen** a previous decision if they change their mind.

After review, Threadline exports the approved context as JSON or Markdown.

```json
{
  "id": "entry-001",
  "type": "event",
  "content": "Created the Threadline repository for OpenAI Build Week.",
  "date": {
    "original": "Saturday, July 18, 2026",
    "normalized": "2026-07-18",
    "precision": "day",
    "timezone": null
  },
  "status": "pending",
  "sourceReferences": [
    {
      "file": "threadline-build-week-conversation.json",
      "location": "/messages/0/content"
    }
  ]
}
```

Entries can represent facts, events, preferences, instructions, projects, or other useful context. Each remains traceable to its source: JSON uses JSON Pointer locations and Markdown uses visible line ranges.

## How we built it

Threadline separates the browser, backend, and OpenAI API:

1. The user selects or drags in one or more JSON or Markdown files.
2. The frontend sends them to a Fastify backend using multipart form data.
3. The backend checks file limits, UTF-8, and JSON syntax before processing each valid source.
4. The backend prepares a bounded extraction request and calls GPT-5.6 through the OpenAI Responses API.
5. GPT-5.6 proposes structured entries with dates and source references.
6. The backend validates the proposal against Threadline's canonical schema.
7. The Vue review interface lets the user accept, edit, reject, or reopen each entry.
8. The reviewed result is exported as JSON or Markdown.

The frontend is built with Vue 3, Vite, and TypeScript. The backend uses Node.js, TypeScript, and Fastify. Session state is intentionally temporary: the MVP has no account system or permanent database.

The OpenAI API key stays in the backend. The live path uses GPT-5.6 for interpretation and extraction, while application code owns validation, provenance, review state, and export. Requests use `store: false`.

Threadline also includes a deterministic Demo Mode. It produces five fictional proposals locally, without an API key or an OpenAI request, so judges can explore the complete review and export experience safely.

## How Codex helped

Codex was part of the project from the first product decision to the working MVP. I used it to:

- Turn the original frustration into a defined product scope and canonical schema.
- Challenge architecture decisions and document their trade-offs.
- Build the Vue frontend, Fastify backend, import validation, review flow, exports, and tests.
- Debug real GPT-5.6 extraction output, including source locators and date normalization.
- Create safe demo sources, improve the interface, and prepare the submission materials.

GPT-5.6 handles the unstructured interpretation task. Codex accelerated the reasoning and implementation work around it.

## Challenges we ran into

AI exports are not standardized. Different providers use different JSON shapes, field names, message formats, and date conventions. Threadline cannot assume a provider-specific structure, so it validates only the technical envelope first and gives GPT-5.6 the source as untrusted content to interpret.

Trust was the second challenge. A fluent model response is not automatically correct or appropriate to preserve. That is why Threadline keeps explicit source references and makes the person, not the model, decide what enters the final context.

The third challenge was making the workflow approachable. Multiple sources, validation errors, AI extraction, and review could easily become a technical control panel. The MVP keeps the experience focused on one clear queue and clear decisions.

## Accomplishments that we're proud of

- A working end-to-end path from multiple-file import to reviewed JSON and Markdown export.
- Live GPT-5.6 extraction with schema validation and traceable source locations.
- A human review flow with `pending`, `accepted`, `edited`, and `rejected` states.
- Drag-and-drop and additive file selection, per-file validation feedback, and useful configuration errors.
- A no-key Demo Mode for repeatable evaluation without exposing credentials.
- Clear public documentation of the architecture, scope, implementation status, and Codex collaboration.

## What we learned

A summary is not the same thing as portable context. Useful context needs provenance, uncertainty, dates where evidence exists, and a human review step.

We also learned that the strongest role for AI here is not to make an invisible final decision. GPT-5.6 can extract and organize useful proposals; normal application code can validate them; and the user can remain in control of what is kept.

## What's next for Threadline

The core MVP is implemented. The next steps are deliberately outside the current scope:

- Cross-source duplicate detection and contradiction assistance.
- Stronger privacy controls and consent-aware sensitive-data handling.
- Evaluation fixtures for more export shapes and model outputs.
- Optional deployment and direct integrations with AI platforms.
- Additional export formats and possible future compatibility with Portable AI Memory through an adapter.

Threadline is not trying to become a permanent memory service. Its goal is simpler: make personal AI context portable without making people surrender control of it.
