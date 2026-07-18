# Manual import validation guide

> Status: **implemented as a repeatable manual test plan**. These checks validate technical import only; they do not call OpenAI or create context entries.

## Scope and safety

Use only the fictional files in `examples/sample-input` or temporary synthetic files created for the test. Do not use real conversation exports or private data during development checks.

The expected flow is:

```text
Select files → POST multipart data → validate each source → display results
```

A successful technical validation returns `entries: []`. That is expected until GPT-5.6 extraction is implemented.

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
2. Select both files from `examples/sample-input`.
3. Confirm that the button changes from disabled to **Validate selected sources**.
4. Submit the files.
5. Confirm that both sources appear as `validated`.
6. Confirm that the interface says no context entries were created and that GPT-5.6 is not connected.

### Partial success

Create one temporary malformed JSON file:

```bash
printf '{ "messages": [' > /tmp/threadline-invalid.json
```

Select that file together with `examples/sample-input/fictional-project-notes.md`. Expected result:

- the Markdown source is `validated`;
- the JSON source reports `invalid_json`;
- the overall request succeeds and the interface shows one validated and one failed source.

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

Both calls should return the same shape. The generated `importId` will differ:

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
  "entries": [],
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
6. `backend/src/extraction/extraction-request.ts` — backend-only source content and future extraction envelopes.
7. `backend/src/domain/threadline-validator.ts` — untrusted model-output validation.

Confirm specifically that source `content` is absent from the technical validation HTTP response.

## Completion checklist

- [ ] Two valid fictional sources return `validated`.
- [ ] Partial success preserves the valid source and reports the invalid source.
- [ ] Complete failure exposes a safe request error and permits retry.
- [ ] Direct backend and Vite-proxy responses match.
- [ ] Oversized files return `413 file_too_large`.
- [ ] No request contacts OpenAI.
- [ ] No private or real conversation data is used.

Remove the temporary fixtures after testing:

```bash
rm /tmp/threadline-invalid.json /tmp/threadline-too-large.md
```
