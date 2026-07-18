<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  ImportRequestError,
  importSources,
  type ImportResponse,
  type SourceImportError,
} from './api/imports'

type ImportState = 'idle' | 'submitting' | 'success' | 'error'

const selectedFiles = ref<File[]>([])
const importState = ref<ImportState>('idle')
const importResult = ref<ImportResponse | null>(null)
const importError = ref<ImportRequestError | null>(null)
const sourceInput = ref<HTMLInputElement | null>(null)

const hasSelectedSources = computed(() => selectedFiles.value.length > 0)
const isSubmitting = computed(() => importState.value === 'submitting')
const canSubmit = computed(() => hasSelectedSources.value && !isSubmitting.value)
const validationErrors = computed<SourceImportError[]>(
  () => importResult.value?.errors ?? importError.value?.errors ?? [],
)
const importButtonLabel = computed(() => {
  if (isSubmitting.value) {
    return 'Validating sources…'
  }

  if (importState.value === 'error') {
    return 'Retry technical validation'
  }

  return 'Validate selected sources'
})

function resetImportOutcome() {
  importState.value = 'idle'
  importResult.value = null
  importError.value = null
}

function handleFileSelection(event: Event) {
  const input = event.target as HTMLInputElement

  selectedFiles.value = Array.from(input.files ?? [])
  resetImportOutcome()
}

function clearSelection() {
  selectedFiles.value = []
  resetImportOutcome()

  if (sourceInput.value !== null) {
    sourceInput.value.value = ''
  }
}

async function submitImport() {
  if (!canSubmit.value) {
    return
  }

  importState.value = 'submitting'
  importResult.value = null
  importError.value = null

  try {
    importResult.value = await importSources(selectedFiles.value)
    importState.value = 'success'
  } catch (error) {
    importError.value =
      error instanceof ImportRequestError
        ? error
        : new ImportRequestError(
            0,
            'backend_unreachable',
            'Threadline could not reach the backend. Confirm that it is running and try again.',
          )
    importState.value = 'error'
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  return `${(bytes / 1024).toFixed(1)} KiB`
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Threadline home">
        <span class="brand-mark" aria-hidden="true">T</span>
        <span>Threadline</span>
      </a>
      <span class="build-status">
        <span class="status-dot status-dot-connected" aria-hidden="true"></span>
        Local import connected
      </span>
    </header>

    <main>
      <section class="hero" aria-labelledby="page-title">
        <p class="eyebrow">Portable, reviewable AI context</p>
        <h1 id="page-title">Turn scattered conversations into context you control.</h1>
        <p class="hero-copy">
          Import JSON and Markdown exports, review every proposed entry, and export only what
          belongs in your final context.
        </p>
        <div class="flow-summary" aria-label="Threadline workflow">
          <span>Import</span><span aria-hidden="true">→</span><span>Extract</span
          ><span aria-hidden="true">→</span><span>Review</span
          ><span aria-hidden="true">→</span><span>Export</span>
        </div>
      </section>

      <section class="workspace" aria-label="Threadline workspace">
        <article class="panel import-panel">
          <div class="panel-heading">
            <div>
              <p class="step-label">01 · Import</p>
              <h2>Select source files</h2>
            </div>
            <span class="limit-note">Up to 10 files</span>
          </div>

          <label class="drop-zone" for="source-files">
            <span class="upload-icon" aria-hidden="true">↑</span>
            <strong>Choose JSON or Markdown files</strong>
            <span>Each file can be up to 2 MiB.</span>
            <input
              id="source-files"
              ref="sourceInput"
              data-testid="source-input"
              type="file"
              accept=".json,.md,.markdown,application/json,text/markdown"
              multiple
              :disabled="isSubmitting"
              @change="handleFileSelection"
            />
          </label>

          <div v-if="hasSelectedSources" class="selection" aria-live="polite">
            <div class="selection-heading">
              <strong
                >{{ selectedFiles.length }} source{{ selectedFiles.length === 1 ? '' : 's' }}</strong
              >
              <button
                class="text-button"
                type="button"
                :disabled="isSubmitting"
                @click="clearSelection"
              >
                Clear
              </button>
            </div>
            <ul class="source-list">
              <li v-for="(source, index) in selectedFiles" :key="`${source.name}-${index}`">
                <span class="file-badge">{{ source.name.split('.').pop()?.toUpperCase() }}</span>
                <span class="source-name">{{ source.name }}</span>
                <span class="source-size">{{ formatFileSize(source.size) }}</span>
              </li>
            </ul>
          </div>
          <p v-else class="empty-selection">No files selected yet.</p>

          <button
            class="primary-button"
            data-testid="import-button"
            type="button"
            :disabled="!canSubmit"
            @click="submitImport"
          >
            {{ importButtonLabel }}
          </button>

          <div
            v-if="importState === 'success' && importResult !== null"
            class="validation-result"
            aria-live="polite"
          >
            <div class="result-heading">
              <div>
                <strong>Technical validation complete</strong>
                <p>
                  {{ importResult.sources.length }} validated · {{ importResult.errors.length }}
                  failed
                </p>
              </div>
              <span class="result-status result-status-success">Ready</span>
            </div>

            <ul class="result-list">
              <li v-for="source in importResult.sources" :key="source.file" class="result-valid">
                <span class="result-icon" aria-hidden="true">✓</span>
                <span>
                  <strong>{{ source.file }}</strong>
                  <small>{{ source.format }} · {{ formatFileSize(source.sizeBytes) }}</small>
                </span>
                <code>{{ source.status }}</code>
              </li>
              <li
                v-for="error in validationErrors"
                :key="`${error.file}-${error.code}`"
                class="result-invalid"
              >
                <span class="result-icon" aria-hidden="true">!</span>
                <span>
                  <strong>{{ error.file }}</strong>
                  <small>{{ error.message }}</small>
                </span>
                <code>{{ error.code }}</code>
              </li>
            </ul>

            <p class="result-footnote">
              No context entries were created. GPT-5.6 extraction is not connected yet.
            </p>
            <small class="import-id">Request {{ importResult.importId }}</small>
          </div>

          <div v-if="importState === 'error' && importError !== null" class="request-error" role="alert">
            <div class="result-heading">
              <div>
                <strong>Import validation failed</strong>
                <p>{{ importError.message }}</p>
              </div>
              <code>{{ importError.code }}</code>
            </div>
            <ul v-if="validationErrors.length > 0" class="compact-error-list">
              <li v-for="error in validationErrors" :key="`${error.file}-${error.code}`">
                <strong>{{ error.file }}</strong>: {{ error.message }}
              </li>
            </ul>
          </div>

          <p class="privacy-note">
            Files are sent only to the local Threadline backend for technical validation. OpenAI
            is not called at this stage.
          </p>
        </article>

        <div class="secondary-column">
          <article class="panel queue-panel">
            <div class="panel-heading">
              <div>
                <p class="step-label">02 · Review</p>
                <h2>Entry queue</h2>
              </div>
              <span class="count-badge">0 pending</span>
            </div>
            <div class="empty-state">
              <span class="empty-state-icon" aria-hidden="true">◎</span>
              <strong>No entries to review</strong>
              <p v-if="importState === 'success'">
                Sources are validated. Context extraction is the next processing stage.
              </p>
              <p v-else>Extracted context will appear here with its source references.</p>
            </div>
            <div class="status-legend" aria-label="Available review states">
              <span>pending</span><span>accepted</span><span>edited</span><span>rejected</span>
            </div>
          </article>

          <article class="panel export-panel">
            <div>
              <p class="step-label">03 · Export</p>
              <h2>Final context</h2>
              <p>Exports include only accepted and edited entries.</p>
            </div>
            <div class="export-actions">
              <button type="button" disabled>Export JSON</button>
              <button type="button" disabled>Export Markdown</button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <footer>
      <span>Threadline MVP</span>
      <span>Vue 3 · Fastify · GPT-5.6 planned</span>
    </footer>
  </div>
</template>
