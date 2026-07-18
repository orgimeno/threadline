import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from './App.vue'

describe('Threadline application shell', () => {
  it('shows the product workflow and planned boundaries', () => {
    const wrapper = mount(App)

    expect(wrapper.get('h1').text()).toContain('context you control')
    expect(wrapper.text()).toContain('No entries to review')
    expect(wrapper.text()).toContain('Export JSON')
  })

  it('lists locally selected source files without starting processing', async () => {
    const wrapper = mount(App)
    const input = wrapper.get('[data-testid="source-input"]')
    const files = [
      new File(['{}'], 'conversation.json', { type: 'application/json' }),
      new File(['# Notes'], 'notes.md', { type: 'text/markdown' }),
    ]

    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: files,
    })
    await input.trigger('change')

    expect(wrapper.text()).toContain('2 sources')
    expect(wrapper.text()).toContain('conversation.json')
    expect(wrapper.text()).toContain('notes.md')
    expect(wrapper.get('.primary-button').attributes('disabled')).toBeDefined()
  })
})
