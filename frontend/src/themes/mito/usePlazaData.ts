import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getModelPlaza, type ModelPlazaResponse } from '@/api/modelPlaza'

/** A single abortable request; never retain another login's prices or telemetry. */
export function usePlazaData(authenticated: () => boolean, live: boolean) {
  const data = ref<ModelPlazaResponse | null>(null)
  const loading = ref(true), loadFailed = ref(false)
  let controller: AbortController | null = null
  let timer: ReturnType<typeof setInterval> | undefined
  let disposed = false
  async function refresh() {
    if (disposed) return
    controller?.abort()
    const current = new AbortController()
    controller = current
    if (!data.value) loading.value = true
    try {
      const next = await getModelPlaza({ signal: current.signal })
      if (current.signal.aborted || disposed) return
      data.value = next
      loadFailed.value = false
    } catch {
      if (current.signal.aborted || disposed) return
      // Failed refreshes must not leave old green bars looking current.
      data.value = null
      loadFailed.value = true
    } finally {
      if (controller === current && !disposed) loading.value = false
    }
  }
  function visibleRefresh() { if (!document.hidden) void refresh() }
  watch(authenticated, () => {
    data.value = null
    void refresh()
  })
  onMounted(() => {
    void refresh()
    if (live) {
      timer = setInterval(visibleRefresh, 60_000)
      document.addEventListener('visibilitychange', visibleRefresh)
    }
  })
  onBeforeUnmount(() => {
    disposed = true
    controller?.abort()
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', visibleRefresh)
  })
  return { data, loading, loadFailed, refresh }
}
