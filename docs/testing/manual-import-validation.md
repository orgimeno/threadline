# Manual import validation guide

> Status: **implemented as a repeatable manual MVP test plan**. It covers the no-key Demo Mode, live-mode configuration errors, technical source validation, review, and export.

## Scope and safety

Use only the fictional files in `examples/sample-input` or temporary synthetic files created for the test. Do not use real conversation exports or private data during development checks.

The expected flow is:

```text
Add files → POST multipart data → validate each source → extract proposals → review → export
```

For the repeatable no-key path, set `DEMO_MODE=true` in `backend/.env` before starting the backend. Demo Mode returns five deterministic fictional entries and never contacts OpenAI. With `DEMO_MODE=false`, a configured backend key enables live GPT-5.6 extraction; without a key, the backend returns `503 extraction_unavailable` with a configuration message.

## Start the application

From the repository root, install dependencies once:

```bash
nvm use
npm install
```

Start the backend in one terminal:

```bash
npm run dev:backend
```

Start the frontend in another terminal:

```bash
npm run dev:frontend
```

The default addresses are:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Frontend development proxy: `http://localhost:5173/api/*`

## Browser checks

### Valid sources

1. Open `http://localhost:5173`.
2. Select `examples/sample-input/fictional-harbor-conversation.json`, then drag or select `examples/sample-input/fictional-harbor-project-notes.md` to confirm that the selection is additive.
3. Confirm that the button changes from disabled to **Validate selected sources**.
4. Submit the files.
5. Confirm that both sources appear as `validated`.
6. In Demo Mode, confirm that five fictional proposals appear in the review queue.
7. Accept one entry, reject another, edit a third entry, and use **Reopen review** on a reviewed entry.
8. Export JSON and Markdown after accepting or editing at least one entry.

### Partial success

Create one temporary malformed JSON file:

```bash
printf '{ "messages": [' > /tmp/threadline-invalid.json
```

Select that file together with `examples/sample-input/fictional-project-notes.md`. Expected result:

- the Markdown source is `validated`;
- the JSON source reports `invalid_json`;
- the overall request succeeds and the interface shows one validated and one failed source plus five Demo Mode proposals.

### Complete validation failure

Select only `/tmp/threadline-invalid.json`. Expected result:

- the request reports `no_valid_sources`;
- the file detail reports `invalid_json`;
- the retry button remains enabled.

## Curl checks

### Call Fastify directly

```bash
curl --silent --show-error \
  -F "files=@examples/sample-input/fictional-preferences.json" \
  -F "files=@examples/sample-input/fictional-project-notes.md" \
  http://localhost:3000/imports
```

### Call through the Vite proxy

```bash
curl --silent --show-error \
  -F "files=@examples/sample-input/fictional-preferences.json" \
  -F "files=@examples/sample-input/fictional-project-notes.md" \
  http://localhost:5173/api/imports
```

Both calls should return the same shape. In Demo Mode, the generated `importId` and the five entries are deterministic apart from the UUID:

```json
{
  "importId": "import-generated-uuid",
  "sources": [
    {
      "file": "fictional-preferences.json",
      "format": "json",
      "sizeBytes": 649,
      "status": "validated"
    },
    {
      "file": "fictional-project-notes.md",
      "format": "markdown",
      "sizeBytes": 691,
      "status": "validated"
    }
  ],
  "entries": [
    {
      "id": "entry-001",
      "type": "project",
      "content": "Demo proposal: Threadline is being prepared as a fictional context-review project.",
      "date": {
        "original": null,
        "normalized": null,
        "precision": "unknown",
        "timezone": null
      },
      "status": "pending",
      "sourceReferences": [
        {
          "file": "fictional-preferences.json",
          "location": ""
        }
      ]
    }
  ],
  "errors": []
}
```

### Partial failure with curl

```bash
curl --silent --show-error \
  -F "files=@examples/sample-input/fictional-project-notes.md" \
  -F "files=@/tmp/threadline-invalid.json" \
  http://localhost:3000/imports
```

### File-size rejection

Create a temporary file one byte above the 2 MiB limit:

```bash
truncate -s 2097153 /tmp/threadline-too-large.md
curl --silent --show-error \
  -F "files=@/tmp/threadline-too-large.md" \
  http://localhost:3000/imports
```

Expected HTTP status: `413`. Expected error code: `file_too_large`.

## Postman checks

1. Create a `POST` request to `http://localhost:3000/imports`.
2. Open **Body** and select **form-data**.
3. Add a key named `files`, change its type from **Text** to **File**, and select a fictional input.
4. Add another `files` key for each additional source.
5. Do not set the `Content-Type` header manually; Postman must generate the multipart boundary.
6. Send the request and compare the response with the curl result.

Repeat with the temporary malformed JSON to verify partial and complete failure responses.

## VS Code review points

Review these boundaries in order:

1. `frontend/src/App.vue` — selection, submission state, result rendering, and retry behavior.
2. `frontend/src/api/imports.ts` — `FormData`, response-envelope checks, and safe request errors.
3. `frontend/vite.config.ts` — `/api` development proxy.
4. `backend/src/routes/imports.ts` — multipart orchestration and public response shape.
5. `backend/src/import/source-validation.ts` — UTF-8, extension, empty-content, and JSON syntax checks.
6. `backend/src/extraction/extraction-request.ts` — backend-only source content and extraction envelopes.
7. `backend/src/domain/threadline-validator.ts` — untrusted model-output validation.

Confirm specifically that source `content` is absent from the technical validation HTTP response.

## Completion checklist

- [ ] Two valid fictional sources return `validated` and five Demo Mode entries.
- [ ] Repeated selection and drag-and-drop add sources instead of replacing them.
- [ ] Partial success preserves the valid source, reports the invalid source, and still returns Demo Mode entries.
- [ ] Complete validation failure exposes a safe request error and permits retry.
- [ ] Direct backend and Vite-proxy responses match.
- [ ] Oversized files return `413 file_too_large`.
- [ ] In Demo Mode, no request contacts OpenAI.
- [ ] In live mode without a key, the interface exposes `extraction_unavailable`.
- [ ] Review actions disappear once decided and **Reopen review** restores `pending`.
- [ ] JSON and Markdown exports contain accepted or edited entries only.
- [ ] No private or real conversation data is used.

Remove the temporary fixtures after testing:

```bash
rm /tmp/threadline-invalid.json /tmp/threadline-too-large.md
```
