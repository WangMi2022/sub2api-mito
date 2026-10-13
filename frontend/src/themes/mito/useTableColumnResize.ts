import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { Column } from '@/components/common/types'

interface ResizeOptions {
  wrapper: Ref<HTMLElement | null>
  columns: () => Column[]
  enabled: () => boolean
  storageKey: () => string | undefined
  selectable: () => boolean
}

/** Owns column sizing, persistence and the complete pointer/keyboard lifecycle. */
export function useTableColumnResize(options: ResizeOptions) {
  const widths = ref<Record<string, number>>({})
  const resizingKey = ref<string | null>(null)
  let drag: {
    column: Column; pointerId: number; startX: number; startWidth: number;
    scrollLeft: number; handle: HTMLElement
  } | null = null

  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
  const getColumnBounds = (column: Column) => {
    const min = finite(column.minWidth) ? Math.max(44, column.minWidth) : 80
    const max = finite(column.maxWidth) ? Math.max(min, column.maxWidth) : Math.max(min, 800)
    return { min, max }
  }
  const clamp = (column: Column, width: number) => {
    const { min, max } = getColumnBounds(column)
    return Math.round(Math.min(max, Math.max(min, width)))
  }
  const defaultWidth = (column: Column) => clamp(column, finite(column.width) ? column.width : 160)
  const canResizeColumn = (column: Column) =>
    options.enabled() && column.key !== 'select' && column.resizable !== false
  const getColumnWidth = (column: Column) =>
    clamp(column, canResizeColumn(column) && finite(widths.value[column.key])
      ? widths.value[column.key] : defaultWidth(column))

  const readWidths = () => {
    if (!options.enabled() || !options.storageKey()) return {}
    try {
      const state = JSON.parse(localStorage.getItem(options.storageKey()!) || 'null')
      if (state?.version !== 1 || !state.widths || Array.isArray(state.widths) || typeof state.widths !== 'object') return {}
      return Object.fromEntries(Object.entries(state.widths).filter(([, width]) => finite(width) && width > 0)) as Record<string, number>
    } catch { return {} }
  }
  const persistWidths = () => {
    if (!options.storageKey()) return
    try {
      localStorage.setItem(options.storageKey()!, JSON.stringify({ version: 1, widths: widths.value }))
    } catch { /* Resizing also works when browser storage is unavailable. */ }
  }
  const setWidth = (column: Column, width: number) => {
    widths.value = { ...widths.value, [column.key]: clamp(column, width) }
  }

  const columnTableStyle = computed(() => options.enabled() ? {
    tableLayout: 'fixed' as const,
    minWidth: '0',
    width: (options.columns().reduce((total, column) => total + getColumnWidth(column), options.selectable() ? 44 : 0)) + 'px'
  } : undefined)
  const columnWrapperStyle = computed(() => options.enabled() ? {
    '--select-col-width': getColumnWidth(options.columns().find(column => column.key === 'select') || { key: 'select', label: '', width: 52, minWidth: 52 }) + 'px'
  } : undefined)

  function finishDrag(commit: boolean) {
    if (!drag) return
    const current = drag
    drag = null
    if (!commit) setWidth(current.column, current.startWidth)
    resizingKey.value = null
    window.removeEventListener('pointermove', movePointer, true)
    window.removeEventListener('pointerup', endPointer, true)
    window.removeEventListener('pointercancel', cancelPointer, true)
    window.removeEventListener('keydown', cancelWithEscape, true)
    window.removeEventListener('blur', cancelDrag)
    current.handle.removeEventListener('lostpointercapture', cancelDrag)
    document.documentElement.classList.remove('mito-column-resizing')
    try {
      if (current.handle.hasPointerCapture?.(current.pointerId)) current.handle.releasePointerCapture(current.pointerId)
    } catch { /* The element may already have left the document. */ }
    if (commit) persistWidths()
  }
  function movePointer(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault()
    const delta = event.clientX - drag.startX + (options.wrapper.value?.scrollLeft || 0) - drag.scrollLeft
    setWidth(drag.column, drag.startWidth + delta)
  }
  function endPointer(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return
    movePointer(event)
    finishDrag(true)
  }
  function cancelPointer(event: PointerEvent) {
    if (drag && event.pointerId === drag.pointerId) finishDrag(false)
  }
  function cancelDrag() { finishDrag(false) }
  function cancelWithEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    finishDrag(false)
  }
  function startColumnResize(event: PointerEvent, column: Column) {
    if (!canResizeColumn(column) || event.button !== 0 || event.isPrimary === false) return
    finishDrag(false)
    event.preventDefault()
    const handle = event.currentTarget as HTMLElement
    handle.focus({ preventScroll: true })
    drag = {
      column, pointerId: event.pointerId, startX: event.clientX,
      startWidth: getColumnWidth(column), scrollLeft: options.wrapper.value?.scrollLeft || 0, handle
    }
    resizingKey.value = column.key
    document.documentElement.classList.add('mito-column-resizing')
    window.addEventListener('pointermove', movePointer, { capture: true, passive: false })
    window.addEventListener('pointerup', endPointer, true)
    window.addEventListener('pointercancel', cancelPointer, true)
    window.addEventListener('keydown', cancelWithEscape, true)
    window.addEventListener('blur', cancelDrag)
    handle.addEventListener('lostpointercapture', cancelDrag)
    try { handle.setPointerCapture?.(event.pointerId) } catch { /* Window listeners provide a fallback. */ }
  }
  function resetColumnWidth(column: Column) {
    if (!canResizeColumn(column)) return
    finishDrag(false)
    const next = { ...widths.value }
    delete next[column.key]
    widths.value = next
    persistWidths()
  }
  function handleColumnResizeKey(event: KeyboardEvent, column: Column) {
    if (!canResizeColumn(column)) return
    const step = event.shiftKey ? 24 : 8
    const { min, max } = getColumnBounds(column)
    const next = event.key === 'ArrowLeft' ? getColumnWidth(column) - step
      : event.key === 'ArrowRight' ? getColumnWidth(column) + step
      : event.key === 'Home' ? min : event.key === 'End' ? max : null
    if (next === null) return
    event.preventDefault()
    finishDrag(false)
    setWidth(column, next)
    persistWidths()
  }

  watch([options.enabled, options.storageKey], () => {
    finishDrag(false)
    widths.value = readWidths()
  }, { immediate: true })
  watch(() => options.columns().map(column => [column.key, column.width, column.minWidth, column.maxWidth, column.resizable].join(':')).join('|'), cancelDrag)
  onBeforeUnmount(cancelDrag)

  return {
    columnTableStyle, columnWrapperStyle, resizingKey, getColumnWidth, getColumnBounds,
    canResizeColumn, startColumnResize, handleColumnResizeKey, resetColumnWidth
  }
}
