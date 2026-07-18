<script setup lang="ts">
import { computed, ref } from 'vue'

interface SelectedSource {
  name: string
  size: number
}

const selectedSources = ref<SelectedSource[]>([])
const hasSelectedSources = computed(() => selectedSources.value.length > 0)

function handleFileSelection(event: Event) {
  const input = event.target as HTMLInputElement

  selectedSources.value = Array.from(input.files ?? []).map((file) => ({
    name: file.name,
    size: file.size,
  }))
}

function clearSelection() {
  selectedSources.value = []
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
        <span class="status-dot" aria-hidden="true"></span>
        Application skeleton
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
              data-testid="source-input"
              type="file"
              accept=".json,.md,.markdown,application/json,text/markdown"
              multiple
              @change="handleFileSelection"
            />
          </label>

          <div v-if="hasSelectedSources" class="selection" aria-live="polite">
            <div class="selection-heading">
              <strong>{{ selectedSources.length }} source{{ selectedSources.length === 1 ? '' : 's' }}</strong>
              <button class="text-button" type="button" @click="clearSelection">Clear</button>
            </div>
            <ul class="source-list">
              <li v-for="source in selectedSources" :key="source.name">
                <span class="file-badge">{{ source.name.split('.').pop()?.toUpperCase() }}</span>
                <span class="source-name">{{ source.name }}</span>
                <span class="source-size">{{ formatFileSize(source.size) }}</span>
              </li>
            </ul>
          </div>
          <p v-else class="empty-selection">No files selected yet.</p>

          <button class="primary-button" type="button" disabled>
            Processing connection planned
          </button>
          <p class="privacy-note">
            Source content will be sent to the OpenAI API only after processing is enabled and
            the user confirms the action.
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
              <p>Extracted context will appear here with its source references.</p>
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
