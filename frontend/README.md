# Threadline frontend

This workspace contains the implemented Vue 3, Vite, and TypeScript frontend for Threadline.

The frontend adds JSON and Markdown files through repeated selection or drag and drop, submits them as `multipart/form-data`, displays import and configuration errors, presents the review queue, supports accept/edit/reject/reopen decisions, and downloads JSON or Markdown exports. During development, Vite proxies `/api/*` to `http://localhost:3000/*`. The client can also use `VITE_API_BASE_URL` when a different API base URL is required.

The frontend never calls OpenAI directly. The backend owns Demo Mode and live GPT-5.6 extraction; `DEMO_MODE=true` is the no-key path for a repeatable five-entry review demo.

Run commands from the repository root whenever possible. See the root [README](../README.md) for setup, development, and verification instructions.
