import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import NativeSelectCompat from '../NativeSelectCompat.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

function host(template: string, setup: () => Record<string, unknown>) {
  return mount({ components: { NativeSelectCompat }, template, setup })
}

describe('NativeSelectCompat', () => {
  it('keeps the native select semantics for v-model-style handlers', async () => {
    const value = ref('a')
    const wrapper = host(
      `<NativeSelectCompat :value="value" data-testid="s" @change="value = $event"><option value="a">A</option><option value="b">B</option></NativeSelectCompat>`,
      () => ({ value })
    )
    await nextTick()
    const el = wrapper.get('[data-testid="s"]').element as HTMLSelectElement
    expect(el.value).toBe('a')
    await wrapper.get('[data-testid="s"]').setValue('b')
    expect(value.value).toBe('b')
    expect(el.value).toBe('b')
    wrapper.unmount()
  })

  it('preserves number option values from :value bindings', async () => {
    const size = ref(20)
    const wrapper = host(
      `<NativeSelectCompat :value="size" data-testid="s" @change="size = $event"><option v-for="n in [20, 50]" :key="n" :value="n">{{ n }}</option></NativeSelectCompat>`,
      () => ({ size })
    )
    await nextTick()
    await wrapper.get('[data-testid="s"]').setValue('50')
    expect(size.value).toBe(50)
    wrapper.unmount()
  })

  it('syncs a late programmatic value after mount (post-flush)', async () => {
    const value = ref('inherit')
    const wrapper = host(
      `<NativeSelectCompat :value="value" data-testid="s" @change="value = $event"><option value="inherit">I</option><option value="custom">C</option></NativeSelectCompat>`,
      () => ({ value })
    )
    await nextTick()
    value.value = 'custom'
    await nextTick()
    expect((wrapper.get('[data-testid="s"]').element as HTMLSelectElement).value).toBe('custom')
    wrapper.unmount()
  })

  it('accepts empty string as a valid controlled value', async () => {
    const value = ref('x')
    const wrapper = host(
      `<NativeSelectCompat :value="value" data-testid="s" @change="value = $event"><option value="">All</option><option value="x">X</option></NativeSelectCompat>`,
      () => ({ value })
    )
    await nextTick()
    value.value = ''
    await nextTick()
    expect((wrapper.get('[data-testid="s"]').element as HTMLSelectElement).value).toBe('')
    wrapper.unmount()
  })

  it('opens the styled panel on click and chooses an option', async () => {
    const value = ref('a')
    const wrapper = host(
      `<NativeSelectCompat :value="value" data-testid="s" @change="value = $event"><option value="a">A</option><option value="b">B</option></NativeSelectCompat>`,
      () => ({ value }),
    )
    await nextTick()
    await wrapper.get('[data-testid="s"]').trigger('click')
    await nextTick()
    const options = document.body.querySelectorAll('.select-dropdown-portal .select-option')
    expect(options.length).toBe(2)
    ;(options[1] as HTMLElement).click()
    await nextTick()
    expect(value.value).toBe('b')
    // 关闭过渡动画结束后面板才移除;等待 leave 过渡完成。
    await new Promise((r) => setTimeout(r, 250))
    expect(document.body.querySelector('.select-dropdown-portal')).toBeNull()
    wrapper.unmount()
  })

  it('reflects dynamically added options', async () => {
    const items = ref(['a'])
    const value = ref('a')
    const wrapper = host(
      `<NativeSelectCompat :value="value" data-testid="s" @change="value = $event"><option v-for="i in items" :key="i" :value="i">{{ i }}</option></NativeSelectCompat>`,
      () => ({ items, value })
    )
    await nextTick()
    items.value = ['a', 'b', 'c']
    await nextTick()
    await nextTick()
    const el = wrapper.get('[data-testid="s"]').element as HTMLSelectElement
    expect(Array.from(el.options).map((o) => o.value)).toEqual(['a', 'b', 'c'])
    await wrapper.get('[data-testid="s"]').setValue('c')
    expect(value.value).toBe('c')
    wrapper.unmount()
  })
})
