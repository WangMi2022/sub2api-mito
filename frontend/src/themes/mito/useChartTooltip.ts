import { onBeforeUnmount } from 'vue'
import type { ChartType, Plugin, TooltipOptions } from 'chart.js'

/** HTML tooltips keep reference motion out of canvas and treat labels as text. */
export function useChartTooltip<T extends ChartType>() {
  let element: HTMLDivElement | undefined
  let dismissal: ReturnType<typeof setTimeout> | undefined

  const cleanup = () => {
    clearTimeout(dismissal)
    element?.remove()
    element = undefined
  }
  onBeforeUnmount(cleanup)

  const external: TooltipOptions<T>['external'] = ({ chart, tooltip }) => {
    clearTimeout(dismissal)
    if (tooltip.opacity === 0) {
      if (element) {
        element.dataset.visible = 'false'
        dismissal = setTimeout(() => { if (element) element.hidden = true }, 150)
      }
      return
    }

    const host = chart.canvas.parentElement
    if (!host) return
    if (!element) {
      element = document.createElement('div')
      element.className = 'mito-chart-tooltip'
      element.setAttribute('role', 'tooltip')
      host.append(element)
    }
    const box = document.createElement('div')
    box.className = 'mito-chart-tooltip-content'
    const title = document.createElement('p')
    title.className = 'mito-chart-tooltip-title'
    title.textContent = tooltip.title?.join(' · ') || ''
    box.append(title)
    for (const line of tooltip.body?.flatMap(item => item.lines) || []) {
      const row = document.createElement('p')
      row.textContent = line
      box.append(row)
    }

    // Reuse the box while tracking a point so its entrance runs once per reveal.
    const current = element.firstElementChild
    if (current && !element.hidden) current.replaceChildren(...Array.from(box.childNodes))
    else element.replaceChildren(box)
    element.hidden = false
    element.dataset.visible = 'true'

    const clamp = (value: number, space: number) => Math.max(12, Math.min(value, space - 12))
    element.style.left = `${clamp(chart.canvas.offsetLeft + tooltip.caretX + 12, host.clientWidth - element.offsetWidth)}px`
    element.style.top = `${clamp(chart.canvas.offsetTop + tooltip.caretY - 16, host.clientHeight - element.offsetHeight)}px`
  }

  // Chart.js destroys a chart when loading or empty replaces it, before Vue's
  // parent unmount. Remove its tooltip then so stale values never cover a spinner.
  const plugins: Plugin<T>[] = [{ id: 'mito-html-tooltip', afterDestroy: cleanup }]
  return { external, plugins }
}
