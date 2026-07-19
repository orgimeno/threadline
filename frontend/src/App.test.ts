import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App.vue'
import { ImportRequestError, importSources, type ImportResponse } from './api/imports'

vi.mock('./api/imports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/imports')>()

  return {
    ...actual,
    importSources: vi.fn(),
  }
})

const importSourcesMock = vi.mocked(importSources)

async function selectFiles(wrapper: VueWrapper, files: File[]) {
  const input = wrapper.get('[data-testid="source-input"]')

  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: files,
  })
  await input.trigger('change')
}

describe('Threadline application shell', () => {
  beforeEach(() => {
    importSourcesMock.mockReset()
  })

  it('shows the product workflow with import disabled until files are selected', () => {
    const wrapper = mount(App)

    expect(wrapper.get('h1').text()).toContain('context you control')
    expect(wrapper.text()).toContain('No entries to review')
    expect(wrapper.text()).toContain('Export JSON')
    expect(wrapper.get('[data-testid="import-button"]').attributes('disabled')).toBeDefined()
  })

  it('lists selected files and enables technical validation', async () => {
    const wrapper = mount(App)
    const files = [
      new File(['{}'], 'conversation.json', { type: 'application/json' }),
      new File(['# Notes'], 'notes.md', { type: 'text/markdown' }),
    ]

    await selectFiles(wrapper, files)

    expect(wrapper.text()).toContain('2 sources')
    expect(wrapper.text()).toContain('conversation.json')
    expect(wrapper.text()).toContain('notes.md')
    expect(wrapper.get('[data-testid="import-button"]').attributes('disabled')).toBeUndefined()
  })

  it('shows validated sources and partial per-file errors', async () => {
    const result: ImportResponse = {
      importId: 'import-test',
      sources: [
        {
          file: 'notes.md',
          format: 'markdown',
          sizeBytes: 7,
          status: 'validated',
        },
      ],
      entries: [],
      errors: [
        {
          file: 'broken.json',
          code: 'invalid_json',
          message: 'The file is not valid JSON and could not be processed.',
        },
      ],
    }
    importSourcesMock.mockResolvedValue(result)
    const wrapper = mount(App)
    const files = [
      new File(['# Notes'], 'notes.md'),
      new File(['{broken}'], 'broken.json'),
    ]

    await selectFiles(wrapper, files)
    await wrapper.get('[data-testid="import-button"]').trigger('click')
    await flushPromises()

    expect(importSourcesMock).toHaveBeenCalledWith(files)
    expect(wrapper.text()).toContain('Technical validation complete')
    expect(wrapper.text()).toContain('1 validated · 1 failed')
    expect(wrapper.text()).toContain('invalid_json')
    expect(wrapper.text()).toContain('sent to OpenAI for structured extraction')
  })

  it('shows a safe request error and allows a retry', async () => {
    importSourcesMock.mockRejectedValue(
      new ImportRequestError(
        422,
        'no_valid_sources',
        'None of the imported files passed technical validation.',
        [
          {
            file: 'broken.json',
            code: 'invalid_json',
            message: 'The file is not valid JSON and could not be processed.',
          },
        ],
      ),
    )
    const wrapper = mount(App)

    await selectFiles(wrapper, [new File(['{broken}'], 'broken.json')])
    await wrapper.get('[data-testid="import-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('no_valid_sources')
    expect(wrapper.get('[role="alert"]').text()).toContain('broken.json')
    expect(wrapper.get('[data-testid="import-button"]').text()).toContain('Retry')
    expect(wrapper.get('[data-testid="import-button"]').attributes('disabled')).toBeUndefined()
  })

  it('prevents another submission while validation is running', async () => {
    let resolveImport: ((result: ImportResponse) => void) | undefined
    importSourcesMock.mockReturnValue(
      new Promise((resolve) => {
        resolveImport = resolve
      }),
    )
    const wrapper = mount(App)

    await selectFiles(wrapper, [new File(['# Notes'], 'notes.md')])
    await wrapper.get('[data-testid="import-button"]').trigger('click')

    expect(wrapper.get('[data-testid="import-button"]').text()).toContain('Validating sources')
    expect(wrapper.get('[data-testid="import-button"]').attributes('disabled')).toBeDefined()

    resolveImport?.({
      importId: 'import-test',
      sources: [],
      entries: [],
      errors: [],
    })
    await flushPromises()
  })
})
