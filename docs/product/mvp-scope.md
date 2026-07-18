# MVP scope

> Status: **planned**. This document defines the product to be built; it does not describe available functionality.

## Included in the MVP

- Web application.
- Multi-file JSON and Markdown import.
- Independent processing of every imported source.
- Structured context proposals extracted with GPT-5.6.
- Backend validation and normalization of model responses.
- An entry-by-entry review queue.
- Review states: `pending`, `accepted`, `edited`, and `rejected`.
- Final-context construction from accepted or edited entries.
- Final-context export as JSON and Markdown.
- References to the source file and, when possible, its source fragment.
- Temporary state during the active session, without permanent persistence.

## Out of scope for the MVP

- Users and authentication.
- Permanent database.
- Direct integrations with ChatGPT, Gemini, Claude, or other providers.
- Automatic conversation synchronization.
- Native mobile application.
- Offline PWA.
- Vector database.
- Advanced semantic search.
- Topic-specific subcontext extraction.

## Initial success criterion

A person can import fictional files or permitted personal files, review extracted proposals clearly, and export final context with source references. Extraction is not considered correct until the person has reviewed its entries.

## Deliberate limits

JSON import does not promise immediate compatibility with every export variant from every provider. The first contract will support generic JSON and Markdown. File size and count limits, long-text chunking, and error policies remain pending decisions and must not be presented as implemented.
