import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import ModelTagInput from '../ModelTagInput.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)

function mountInput(modelValue: string[] = []) {
  return mount(ModelTagInput, {
    props: { modelValue, candidates: ['gpt-6-luna', 'gpt-6-sol'] },
    global: { stubs: { Icon: true, teleport: true } }
  })
}

const lastEmitted = (wrapper: ReturnType<typeof mountInput>) =>
  wrapper.emitted('update:modelValue')?.at(-1)?.[0]

describe('ModelTagInput', () => {
  it('adds typed models on Enter and splits pasted lists including wildcards', async () => {
    const wrapper = mountInput()
    const draft = wrapper.get('[data-testid="model-tag-draft"]')
    await draft.setValue('gpt-6-luna, gpt-6-*  claude-opus-*')
    await draft.trigger('keydown', { key: 'Enter' })
    expect(lastEmitted(wrapper)).toEqual(['gpt-6-luna', 'gpt-6-*', 'claude-opus-*'])
  })

  it('ignores duplicates regardless of case', async () => {
    const wrapper = mountInput(['gpt-6-luna'])
    const draft = wrapper.get('[data-testid="model-tag-draft"]')
    await draft.setValue('GPT-6-LUNA')
    await draft.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('does not commit or move selection during IME composition', async () => {
    const wrapper = mountInput()
    const draft = wrapper.get('[data-testid="model-tag-draft"]')
    await draft.setValue('gpt')
    await draft.trigger('keydown', { key: 'ArrowDown', isComposing: true })
    await draft.trigger('keydown', { key: 'Enter', isComposing: true })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(draft.attributes('aria-activedescendant')).toBeUndefined()
  })

  it('removes a model with its button or Backspace on an empty draft', async () => {
    const wrapper = mountInput(['gpt-6-luna', 'gpt-6-sol'])
    await wrapper.get('button[aria-label="common.remove gpt-6-luna"]').trigger('click')
    expect(lastEmitted(wrapper)).toEqual(['gpt-6-sol'])
    await wrapper.get('[data-testid="model-tag-draft"]').trigger('keydown', { key: 'Backspace' })
    expect(lastEmitted(wrapper)).toEqual(['gpt-6-luna'])
  })

  it('opens a styled list of unselected models and removes duplicate candidates', async () => {
    const wrapper = mountInput(['gpt-6-luna'])
    await wrapper.setProps({ candidates: ['gpt-6-luna', 'gpt-6-sol', 'GPT-6-SOL'] })
    await wrapper.get('[data-testid="model-tag-draft"]').trigger('focus')
    expect(wrapper.find('datalist').exists()).toBe(false)
    expect(wrapper.findAll('[role="option"]').map(option => option.text())).toEqual(['gpt-6-sol'])
  })

  it('selects a suggestion without accidentally adding the partial search text', async () => {
    const wrapper = mountInput()
    await wrapper.get('[data-testid="model-tag-draft"]').setValue('GPT-6-LU')
    await wrapper.get('[role="option"]').trigger('click')
    expect(lastEmitted(wrapper)).toEqual(['gpt-6-luna'])
    await wrapper.get('[data-testid="model-tag-draft"]').trigger('blur')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  })

  it('navigates model candidates with arrow keys and Enter', async () => {
    const wrapper = mountInput()
    const draft = wrapper.get('[data-testid="model-tag-draft"]')
    await draft.trigger('focus')
    await draft.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.get('[aria-selected="true"]').text()).toBe('gpt-6-sol')
    expect(draft.attributes('aria-activedescendant')).toBe(wrapper.get('[aria-selected="true"]').attributes('id'))
    await draft.trigger('keydown', { key: 'Enter' })
    expect(lastEmitted(wrapper)).toEqual(['gpt-6-sol'])
  })

  it('dismisses suggestions with Escape without propagating to the dialog', async () => {
    const wrapper = mountInput()
    const parentEscape = vi.fn()
    wrapper.element.addEventListener('keydown', parentEscape)
    const draft = wrapper.get('[data-testid="model-tag-draft"]')
    await draft.trigger('focus')
    await draft.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(parentEscape).not.toHaveBeenCalled()
    await draft.trigger('keydown', { key: 'Escape' })
    expect(parentEscape).toHaveBeenCalledOnce()
    wrapper.element.removeEventListener('keydown', parentEscape)
  })

  it('keeps custom input and blur commit available when no candidates match', async () => {
    const wrapper = mountInput()
    const draft = wrapper.get('[data-testid="model-tag-draft"]')
    await draft.setValue('custom-*')
    expect(wrapper.text()).toContain('admin.groups.modelCandidatesNoMatch')
    await draft.trigger('blur')
    expect(lastEmitted(wrapper)).toEqual(['custom-*'])
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })
})
