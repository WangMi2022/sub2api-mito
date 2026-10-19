import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { getModelPlaza } from '@/api/modelPlaza'
import { usePlazaData } from '../usePlazaData'

vi.mock('@/api/modelPlaza', () => ({ getModelPlaza: vi.fn() }))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

describe('usePlazaData request lifecycle', () => {
  it('refreshes, clears failed telemetry, and stops polling on unmount', async () => {
    vi.useFakeTimers()
    const request = vi.mocked(getModelPlaza)
    request.mockResolvedValue({ description: 'first', groups: [] })
    let state!: ReturnType<typeof usePlazaData>
    const wrapper = mount(defineComponent({ setup() { state = usePlazaData(() => true, true); return () => null } }))
    await flushPromises()
    expect(state.data.value?.description).toBe('first')
    request.mockRejectedValue(new Error('unavailable'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(state.data.value).toBeNull()
    expect(state.loadFailed.value).toBe(true)
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('aborts superseded logins and never restores a stale response', async () => {
    const auth = ref(false)
    const request = vi.mocked(getModelPlaza)
    let finish!: (value: { description: string; groups: [] }) => void
    request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    request.mockResolvedValue({ description: 'signed-in', groups: [] })
    let state!: ReturnType<typeof usePlazaData>
    const wrapper = mount(defineComponent({ setup() { state = usePlazaData(() => auth.value, true); return () => null } }))
    const signal = request.mock.calls[0][0]!.signal!
    auth.value = true
    await flushPromises()
    expect(signal.aborted).toBe(true)
    finish({ description: 'stale-anonymous', groups: [] })
    await flushPromises()
    expect(state.data.value?.description).toBe('signed-in')
    wrapper.unmount()
    expect(request.mock.calls[1][0]!.signal!.aborted).toBe(true)
  })
})
