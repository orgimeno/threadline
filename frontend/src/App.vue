<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  ImportRequestError,
  importSources,
  reviewEntry,
  reopenReviewEntry,
  exportContext,
  type ContextEntry,
  type ImportResponse,
  type SourceImportError,
  type ThreadlineDate,
} from './api/imports'

type ImportState = 'idle' | 'submitting' | 'success' | 'error'
type ReviewStatus = 'accepted' | 'edited' | 'rejected'
type ReviewFeedback = 'positive' | 'negative' | null

const reviewFeedbackDelayMs = 420

const selectedFiles = ref<File[]>([])
const importState = ref<ImportState>('idle')
const importResult = ref<ImportResponse | null>(null)
const importError = ref<ImportRequestError | null>(null)
const sourceInput = ref<HTMLInputElement | null>(null)
const entries = ref<ContextEntry[]>([])
const editedContent = ref('')
const reviewError = ref<string | null>(null)
const isEditing = ref(false)
const isReviewing = ref(false)
const reviewFeedback = ref<ReviewFeedback>(null)
const selectedEntryId = ref<string | null>(null)
const isDraggingFiles = ref(false)
let dragDepth = 0

const hasSelectedSources = computed(() => selectedFiles.value.length > 0)
const isSubmitting = computed(() => importState.value === 'submitting')
const canSubmit = computed(() => hasSelectedSources.value && !isSubmitting.value)
const validationErrors = computed<SourceImportError[]>(
  () => importResult.value?.errors ?? importError.value?.errors ?? [],
)
const currentEntry = computed(() => entries.value.find((entry) => entry.id === selectedEntryId.value) ?? entries.value.find((entry) => entry.status === 'pending') ?? null)
const currentIndex = computed(() => currentEntry.value === null ? -1 : entries.value.findIndex((entry) => entry.id === currentEntry.value?.id))
const pendingCount = computed(() => entries.value.filter((entry) => entry.status === 'pending').length)
const approvedCount = computed(() => entries.value.filter((entry) => entry.status === 'accepted' || entry.status === 'edited').length)
const reviewComplete = computed(() => entries.value.length > 0 && pendingCount.value === 0)
const reviewFeedbackLabel = computed(() => reviewFeedback.value === 'negative' ? 'Rejected' : 'Saved')
const importButtonLabel = computed(() => {
  if (isSubmitting.value) {
    return 'Validating sources…'
  }

  if (importState.value === 'error') {
    return 'Retry technical validation'
  }

  return 'Validate selected sources'
})

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function setEditForm(entry: ContextEntry | null) {
  editedContent.value = entry?.content ?? ''
}

function displayDate(date: ThreadlineDate): string {
  const value = date.normalized ?? date.original
  if (value === null) return 'No date supplied'
  const readableValue = value.replace('T', ' ')
  return date.timezone === null ? readableValue : `${readableValue} · ${date.timezone}`
}

function resetImportOutcome() {
  importState.value = 'idle'
  importResult.value = null
  importError.value = null
  reviewError.value = null
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function addFiles(files: Iterable<File>) {
  const knownFiles = new Set(selectedFiles.value.map(fileKey))
  const additions = Array.from(files).filter((file) => {
    const key = fileKey(file)
    if (knownFiles.has(key)) return false
    knownFiles.add(key)
    return true
  })

  if (additions.length === 0) return

  selectedFiles.value = [...selectedFiles.value, ...additions]
  resetImportOutcome()
}

function handleFileSelection(event: Event) {
  const input = event.target as HTMLInputElement

  addFiles(input.files ?? [])
  // Resetting lets users add the same file again after removing it from the list.
  input.value = ''
}

function handleDragEnter() {
  if (isSubmitting.value) return
  dragDepth += 1
  isDraggingFiles.value = true
}

function handleDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  isDraggingFiles.value = dragDepth > 0
}

function handleDrop(event: DragEvent) {
  dragDepth = 0
  isDraggingFiles.value = false
  if (isSubmitting.value) return
  addFiles(event.dataTransfer?.files ?? [])
}

function removeFile(index: number) {
  selectedFiles.value = selectedFiles.value.filter((_, currentIndex) => currentIndex !== index)
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
    entries.value = importResult.value.entries
    selectedEntryId.value = entries.value[0]?.id ?? null
    setEditForm(currentEntry.value)
    isEditing.value = false
    reviewFeedback.value = null
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

async function decide(status: ReviewStatus) {
  if (currentEntry.value === null || isReviewing.value) return
  reviewError.value = null
  isReviewing.value = true
  try {
    const updated = await reviewEntry(
      currentEntry.value.id,
      status,
      status === 'edited' ? { content: editedContent.value } : {},
    )
    entries.value = entries.value.map((entry) => entry.id === updated.id ? updated : entry)
    reviewFeedback.value = status === 'rejected' ? 'negative' : 'positive'
    await wait(reviewFeedbackDelayMs)
    selectedEntryId.value = entries.value.find((entry) => entry.status === 'pending')?.id ?? updated.id
    setEditForm(currentEntry.value)
    isEditing.value = false
  } catch (error) {
    reviewError.value = error instanceof Error ? error.message : 'Could not save this review decision.'
  } finally {
    reviewFeedback.value = null
    isReviewing.value = false
  }
}

async function reopenReview() {
  if (currentEntry.value === null || isReviewing.value) return
  reviewError.value = null
  isReviewing.value = true
  try {
    const updated = await reopenReviewEntry(currentEntry.value.id)
    entries.value = entries.value.map((entry) => entry.id === updated.id ? updated : entry)
    selectedEntryId.value = updated.id
    setEditForm(updated)
    isEditing.value = false
  } catch (error) {
    reviewError.value = error instanceof Error ? error.message : 'Could not reopen this review entry.'
  } finally {
    isReviewing.value = false
  }
}

function startEditing() {
  setEditForm(currentEntry.value)
  isEditing.value = true
}

function cancelEditing() {
  setEditForm(currentEntry.value)
  isEditing.value = false
}

function selectEntry(id: string) {
  if (isReviewing.value) return
  selectedEntryId.value = id
  setEditForm(currentEntry.value)
  isEditing.value = false
  reviewError.value = null
}

function moveEntry(direction: -1 | 1) {
  const next = entries.value[currentIndex.value + direction]
  if (next !== undefined) selectEntry(next.id)
}

async function download(format: 'json' | 'markdown') {
  const blob = await exportContext(format)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob); link.download = `threadline-context.${format === 'json' ? 'json' : 'md'}`; link.click(); URL.revokeObjectURL(link.href)
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

          <label
            :class="['drop-zone', { 'is-dragging': isDraggingFiles }]"
            for="source-files"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
          >
            <span class="upload-icon" aria-hidden="true">↑</span>
            <strong>Drop JSON or Markdown files here, or choose files</strong>
            <span>Files are added to your selection. Up to 10 files, 2 MiB each.</span>
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
                <button
                  class="remove-file"
                  type="button"
                  :disabled="isSubmitting"
                  :aria-label="`Remove ${source.name}`"
                  @click.prevent="removeFile(index)"
                >
                  Remove
                </button>
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
          <p v-if="isSubmitting" class="processing-indicator" role="status" aria-live="polite">
            <span class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span>Extracting context. Larger sources can take a moment.</span>
          </p>

          <div
            v-if="importState === 'success' && importResult !== null"
            class="validation-result"
            aria-live="polite"
          >
            <div class="result-heading">
              <div>
                <strong>{{ entries.length > 0 ? 'Extraction complete' : 'Technical validation complete' }}</strong>
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
              {{ entries.length === 0 ? 'No useful context entries were found in these sources.' : `${entries.length} context entries are ready for review.` }}
            </p>
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
            Files are validated by the local backend and, when valid, sent to OpenAI for structured extraction. They are kept only for this temporary session and are not stored by Threadline.
          </p>
        </article>

        <div class="secondary-column">
          <article class="panel queue-panel">
            <div class="panel-heading">
              <div>
                <p class="step-label">02 · Review</p>
                <h2>Entry queue</h2>
              </div>
              <span class="count-badge">{{ pendingCount }} pending</span>
            </div>
            <div v-if="currentEntry === null" class="empty-state">
              <span class="empty-state-icon" aria-hidden="true">◎</span>
              <strong>No entries to review</strong>
              <p v-if="importState === 'success'">
                Sources are validated. Context extraction is the next processing stage.
              </p>
              <p v-else>Extracted context will appear here with its source references.</p>
            </div>
            <div v-if="reviewComplete" class="review-complete">
              <span aria-hidden="true">✓</span>
              <div><strong>Review complete</strong><p>{{ approvedCount }} entries are ready to export.</p></div>
            </div>
            <div v-if="currentEntry !== null">
              <div class="review-progress">
                <span>{{ currentIndex + 1 }} of {{ entries.length }}</span>
                <div class="progress-track"><span :style="{ width: `${((currentIndex + 1) / entries.length) * 100}%` }"></span></div>
                <span>{{ pendingCount }} pending</span>
              </div>
              <div class="entry-navigator" aria-label="Recognized entries">
                <button v-for="(entry, index) in entries" :key="entry.id" type="button" :disabled="isReviewing" :class="['nav-entry', entry.status, { active: entry.id === currentEntry.id, done: entry.status !== 'pending' }]" @click="selectEntry(entry.id)">
                  {{ index + 1 }}
                </button>
              </div>
              <Transition name="entry-card" mode="out-in">
                <div
                  :key="currentEntry.id"
                  :class="['review-card', `review-card-${currentEntry.status}`, { 'is-reviewed': currentEntry.status !== 'pending' }]"
                >
                  <div
                    v-if="reviewFeedback !== null"
                    :class="['decision-feedback', reviewFeedback]"
                    role="status"
                    aria-live="polite"
                  >
                    <span aria-hidden="true">{{ reviewFeedback === 'negative' ? '×' : '✓' }}</span>
                    <strong>{{ reviewFeedbackLabel }}</strong>
                  </div>
                  <div class="review-card-header">
                    <span class="entry-type">{{ currentEntry.type }}</span>
                    <div class="entry-meta">
                      <span class="entry-id">{{ currentEntry.id }}</span>
                      <button
                        v-if="currentEntry.status !== 'pending'"
                        class="reopen-review"
                        type="button"
                        :disabled="isReviewing"
                        title="Clear this decision and return the entry to the review queue"
                        @click="reopenReview"
                      >
                        ↶ Reopen review
                      </button>
                    </div>
                  </div>
                  <p v-if="currentEntry.status !== 'pending'" class="reviewed-state" aria-live="polite">
                    {{ currentEntry.status === 'edited' ? 'Edited and accepted' : currentEntry.status }}
                  </p>
                  <p class="review-prompt">Keep this in your portable context?</p>
                  <p v-if="!isEditing" class="entry-content">{{ currentEntry.content }}</p>
                  <textarea v-else v-model="editedContent" class="entry-editor" aria-label="Edit entry content"></textarea>
                  <p v-if="!isEditing" class="entry-date">{{ displayDate(currentEntry.date) }}</p>
                  <p v-else class="entry-date">Extracted date: {{ displayDate(currentEntry.date) }}</p>
                  <div class="evidence">
                    <span class="evidence-label">Source evidence</span>
                    <ul>
                      <li v-for="reference in currentEntry.sourceReferences" :key="`${reference.file}-${reference.location}`">
                        <strong>{{ reference.file }}</strong><code>{{ reference.location }}</code>
                      </li>
                    </ul>
                  </div>
                  <div v-if="currentEntry.status === 'pending' && !isEditing" class="review-actions">
                    <button class="accept-action" type="button" :disabled="isReviewing" @click="decide('accepted')">Accept</button>
                    <button class="edit-action" type="button" :disabled="isReviewing" @click="startEditing">Edit</button>
                    <button class="reject-action" type="button" :disabled="isReviewing" @click="decide('rejected')">Reject</button>
                  </div>
                  <div v-else-if="isEditing" class="review-actions">
                    <button class="accept-action" type="button" :disabled="isReviewing" @click="decide('edited')">Save edit</button>
                    <button class="edit-action" type="button" :disabled="isReviewing" @click="cancelEditing">Cancel</button>
                  </div>
                  <p v-if="reviewError" class="request-error">{{ reviewError }}</p>
                </div>
              </Transition>
              <div class="review-pagination">
                <button type="button" :disabled="currentIndex === 0 || isReviewing" @click="moveEntry(-1)">← Previous</button>
                <button type="button" :disabled="currentIndex === entries.length - 1 || isReviewing" @click="moveEntry(1)">Next →</button>
              </div>
            </div>
            <div class="status-legend" aria-label="Available review states">
              <span>pending</span><span>accepted</span><span>edited</span><span>rejected</span>
            </div>
          </article>

          <article class="panel export-panel">
            <div>
              <p class="step-label">03 · Export</p>
              <h2>Final context</h2>
              <p>{{ approvedCount }} approved entries. Exports include accepted and edited entries.</p>
            </div>
            <div class="export-actions">
              <button type="button" :disabled="approvedCount === 0" @click="download('json')">Export JSON</button>
              <button type="button" :disabled="approvedCount === 0" @click="download('markdown')">Export Markdown</button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <footer>
      <span>Threadline MVP</span>
      <span>Vue 3 · Fastify · GPT-5.6</span>
    </footer>
  </div>
</template>
