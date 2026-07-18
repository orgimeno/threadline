# Threadline frontend

This workspace contains the Vue 3, Vite, and TypeScript frontend for Threadline.

The current implementation selects JSON and Markdown files, submits them as `multipart/form-data`, and displays technical validation results from the backend. During development, Vite proxies `/api/*` to `http://localhost:3000/*`. The client can also use `VITE_API_BASE_URL` when a different API base URL is required.

It does not call OpenAI, extract context entries, mutate review state, or create real exports yet.

Run commands from the repository root whenever possible. See the root [README](../README.md) for setup, development, and verification instructions.
