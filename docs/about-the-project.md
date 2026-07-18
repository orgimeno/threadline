## Inspiration

Threadline started with a problem I had personally experienced: useful context was spread across too many AI conversations.

Some information lived in ChatGPT, some in Gemini, some in Claude, and some in exported JSON files or Markdown notes. The first context files I created were useful, but also **mixed, repetitive, inconsistently dated, and difficult to trust as a single source of truth**.

I could paste everything into a new conversation and ask an AI to summarize it. That works once. It is not a repeatable workflow, and it gives the user very little control over what is preserved, changed, or discarded.

Threadline is my attempt to turn that messy collection of exports into a structured, reviewable, portable context.

## What it does

Threadline lets a user import multiple AI conversation exports, starting with JSON and Markdown files.

The application sends the sources to a backend, processes each file separately, and uses GPT-5.6 to extract structured context entries. The backend then validates, normalizes, and consolidates the results while preserving where each entry came from.

The user receives a review queue rather than one enormous generated summary. Each entry can be:

- **Accepted**, so it becomes part of the final context.
- **Edited**, so the user can correct its content, category, or date.
- **Rejected**, so it is excluded from the final result.

When all entries have been reviewed, Threadline builds a final context that can be downloaded as JSON or Markdown.

A simplified entry may look like this:

```json
{
  "id": "entry-001",
  "type": "event",
  "content": "Started a new role as a software developer.",
  "date": {
    "original": "March 2026",
    "normalized": "2026-03",
    "precision": "month"
  },
  "status": "pending",
  "sourceReferences": [
    {
      "file": "conversation-01.json",
      "location": "message-42"
    }
  ]
}
```

An entry can represent an event, fact, preference, instruction, project, or another meaningful piece of context. The important part is that the user can inspect it and trace it back to its source.

## How we built it

Threadline is being designed as a web application with a clear separation between the browser, the backend, and the OpenAI API.

The current MVP flow is:

1. The user imports one or more JSON or Markdown files in the browser.
2. The frontend sends the files to the Threadline backend.
3. The backend validates the files and processes each source separately.
4. The backend prepares the content for GPT-5.6.
5. GPT-5.6 returns structured JSON entries.
6. The backend validates and consolidates those entries.
7. The frontend presents a review queue.
8. The user accepts, edits, or rejects each entry.
9. The backend builds the final context.
10. The user downloads the result as JSON or Markdown.

Codex has been involved from the beginning. I used it to explore the original problem, challenge the product assumptions, define the MVP, design the flow, and turn the idea into an implementable architecture.

The application uses GPT-5.6 for interpretation and extraction. The backend remains responsible for validation, normalization, provenance, and final assembly. The OpenAI API key is kept on the server and is never exposed to the browser.

For the first MVP, there is no user account or permanent database. The files and reviewed entries exist during the current session, and the result is exported by the user. This keeps the first version focused on the core workflow.

## Challenges we ran into

The main challenge is that AI exports are not standardized. Different providers use different JSON structures, field names, message formats, and date representations. Some exports contain precise dates, while others use relative expressions or incomplete information.

The second challenge is that context changes over time. Two entries may be duplicates, compatible updates, or genuine contradictions. Threadline must surface those cases without silently deciding what the user's history means.

The third challenge is trust. A model can interpret text, but it should not rewrite a person's context invisibly. That is why the workflow includes source references, review states, and explicit user decisions.

There is also a practical challenge: the product must work with multiple files without turning the interface into a technical control panel. The user should see a clear queue of meaningful entries, not the internal machinery used to create them.

## Accomplishments that we're proud of

The first accomplishment was turning a personal frustration into a concrete product problem: **AI context is becoming valuable, but it is still difficult to carry between tools.**

We also defined a complete MVP flow rather than stopping at the idea of "send several JSON files to an AI". Threadline now has a clear path from import to export, including:

- Multiple-source input
- Per-source processing
- Structured model output
- Source references
- Human review
- Accept, edit, and reject states
- Final JSON and Markdown export

The flowchart itself became an important milestone. It helped separate what belongs in the frontend, what belongs in the backend, and what should be delegated to GPT-5.6.

## What we learned

I learned that a summary is not the same thing as portable context.

A useful context system needs dates, sources, categories, uncertainty, and a way to represent change. It also needs a human review step, because the most fluent model output is not automatically the most accurate or useful result.

I also learned that AI is valuable here for more than generating text. It can help extract, classify, compare, and organize information, while ordinary application code can provide the validation and control around it.

Finally, I learned that defining the flow before choosing the technology makes the project easier to reason about. Once the product boundaries were clear, the technical decisions became smaller and more practical.

Building Threadline also made me realize that software development is entering a fascinating new era. AI is changing not only the products we build, but also the way we think, design, and create them.


## What's next for Threadline

The next step is to implement the first vertical slice:

```text
Import one JSON file -> extract entries -> review one entry -> export JSON
```

After that, the MVP will expand to multiple JSON and Markdown files, duplicate detection, possible conflict detection, and the complete review queue shown in the flowchart.

Future versions could add more export formats, stronger privacy controls, local processing options, and direct integrations with AI platforms.

A longer-term feature is a **context extractor**. Starting from a general context, the user could ask Threadline to produce a focused version containing only information about work, health, finances, relationships, or a specific project.

The goal is simple: make personal AI context portable without making the user surrender control of it.
