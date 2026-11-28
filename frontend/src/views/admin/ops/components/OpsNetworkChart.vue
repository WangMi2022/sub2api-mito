<template>
  <section class="card mito-ops-network space-y-3 p-4" data-testid="ops-network-chart">
    <h3 class="font-semibold">{{ t('latencyObservability.networkTitle') }}</h3>
    <p class="text-xs text-gray-500">{{ t('latencyObservability.networkScope') }}</p>
    <p v-if="error" role="alert">{{ t('latencyObservability.error') }}</p>
    <p v-else-if="!data?.points.length">{{ t('latencyObservability.empty') }}</p>
    <label v-if="instances.length" class="text-sm">{{ t('latencyObservability.instance') }}
      <NativeSelectCompat :value="selected" class="input ml-2" @change="selected = $event"><option v-for="(id, i) in instances" :key="id" :value="id">{{ instanceLabel(id, i) }}</option></NativeSelectCompat>
    </label>
    <div class="grid gap-4 md:grid-cols-2">
      <div v-for="series in curves" :key="series.key" class="mito-ops-network-cell" :data-testid="`network-${series.key}`">
        <h4 class="text-sm">{{ t(`latencyObservability.${series.key}`) }}</h4>
        <svg :viewBox="`0 0 ${W} ${H}`" class="mito-ops-network-svg h-36 w-full" role="img" :aria-label="t(`latencyObservability.${series.key}`)">
          <!-- gridlines + y-axis labels -->
          <g class="mito-ops-network-grid">
            <line v-for="tick in yTicks(series.values)" :key="`g${tick.y}`" :x1="PAD_L" :x2="W - PAD_R" :y1="tick.y" :y2="tick.y" />
            <text v-for="tick in yTicks(series.values)" :key="`t${tick.y}`" :x="PAD_L - 6" :y="tick.y + 3" text-anchor="end">{{ tick.label }}</text>
          </g>
          <!-- x-axis baseline + time ticks -->
          <line class="mito-ops-network-axis" :x1="PAD_L" :x2="W - PAD_R" :y1="H - PAD_B" :y2="H - PAD_B" />
          <g class="mito-ops-network-grid">
            <text v-for="tick in xTicks(series.values)" :key="`x${tick.x}`" :x="tick.x" :y="H - PAD_B + 14" text-anchor="middle">{{ tick.label }}</text>
          </g>
          <!-- area fill under the line -->
          <path v-if="area(series.values)" :d="area(series.values)" class="mito-ops-network-area" />
          <path :d="path(series.values)" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="text-sky-600 mito-ops-network-line" />
          <circle v-for="(v, i) in series.values" :key="i" :cx="x(i, series.values)" :cy="y(v.value, series.values)" :r="v.value == null ? 0 : 2.5" class="fill-sky-600 mito-ops-network-dot"><title>{{ v.at }} · {{ v.value ?? t('latencyObservability.notCollected') }} · {{ v.status }}</title></circle>
        </svg>
        <p class="text-xs text-gray-500">{{ series.values.at(-1)?.value ?? t('latencyObservability.notCollected') }} · {{ series.values.at(-1)?.status ?? t('latencyObservability.notCollected') }}</p>
        <p v-if="series.values.length" class="flex justify-between text-xs text-gray-400"><span>{{ series.values[0]?.at.slice(11, 16) }} UTC</span><span>{{ series.values.at(-1)?.at.slice(11, 16) }} UTC</span></p>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import NativeSelectCompat from '@/components/common/NativeSelectCompat.vue'
import { computed, ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getNetworkSeries, type NetworkSeries } from '@/api/admin/opsNetwork'
const props = defineProps<{ refreshToken?: number }>()
const { t } = useI18n()
const data = ref<NetworkSeries | null>(null), error = ref(false), selected = ref('')
const instances = computed(() => [...new Set(data.value?.points.map(p => p.instance) ?? [])])
const points = computed(() => data.value?.points.filter(p => p.instance === selected.value) ?? [])
// 实例显示名称:服务端下发 site_name 标签;旧服务端无标签时回退序号+ID 片段。
const instanceLabel = (id: string, index: number) => data.value?.instance_labels?.[id] ?? `${index + 1} · ${id.slice(0, 8)}`
interface Value { at: string; value: number | null; status: string }
const curves = computed(() => [
  { key: 'egress', values: points.value.map(p => ({ at: p.at, value: p.egress_mbps, status: p.egress_status })) },
  { key: 'retrans', values: points.value.map(p => ({ at: p.at, value: p.tcp_retrans_percent, status: p.tcp_status })) },
  { key: 'qdisc', values: points.value.map(p => ({ at: p.at, value: p.qdisc_drops, status: p.qdisc_status })) },
])
// Chart geometry: left/bottom padding leaves room for axis labels.
const W = 600, H = 140, PAD_L = 44, PAD_R = 10, PAD_T = 10, PAD_B = 22
const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B
const maxValue = (values: Value[]) => Math.max(1, ...values.map(v => v.value ?? 0))
// Round the axis ceiling up to a friendly step so gridline labels are readable.
const niceCeiling = (values: Value[]) => {
  const raw = maxValue(values)
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude
    if (candidate >= raw) return candidate
  }
  return 10 * magnitude
}
const x = (i: number, values: Value[]) => {
  const start = Date.parse(values[0]?.at ?? '')
  const end = Date.parse(values.at(-1)?.at ?? '')
  const value = Date.parse(values[i]?.at ?? '')
  return Number.isFinite(start + end + value) ? PAD_L + (value - start) * plotW / Math.max(60000, end - start) : PAD_L
}
const y = (value: number | null, values: Value[]) => PAD_T + plotH - (value ?? 0) * plotH / niceCeiling(values)
const formatTick = (value: number) => value >= 100 ? String(Math.round(value)) : value >= 10 ? value.toFixed(1).replace(/\.0$/, '') : value.toFixed(2).replace(/\.?0+$/, '')
const yTicks = (values: Value[]) => {
  if (!values.length) return []
  const ceiling = niceCeiling(values)
  return [0, 0.5, 1].map(fraction => ({
    y: PAD_T + plotH - fraction * plotH,
    label: formatTick(ceiling * fraction)
  }))
}
const xTicks = (values: Value[]) => {
  if (values.length < 2) return []
  const picks = [0, Math.floor((values.length - 1) / 2), values.length - 1]
  return [...new Set(picks)].map(i => ({ x: x(i, values), label: values[i]?.at.slice(11, 16) ?? '' }))
}
const path = (values: Value[]) => {
  let result = '', connected = false
  values.forEach((v, i) => {
    if (v.value == null || (i > 0 && Date.parse(v.at) - Date.parse(values[i - 1]!.at) > 90000)) connected = false
    if (v.value != null) { result += `${connected ? 'L' : 'M'}${x(i, values)},${y(v.value, values)} `; connected = true }
  })
  return result
}
// Soft area fill: same segments as the line, closed to the baseline.
const area = (values: Value[]) => {
  let result = '', segment = '', open = false, lastX = PAD_L
  const flush = () => {
    if (open && segment) result += `${segment}L${lastX},${PAD_T + plotH} L${segmentStart},${PAD_T + plotH} Z `
    segment = ''; open = false
  }
  let segmentStart = PAD_L
  values.forEach((v, i) => {
    if (v.value == null || (i > 0 && Date.parse(v.at) - Date.parse(values[i - 1]!.at) > 90000)) flush()
    if (v.value != null) {
      const px = x(i, values), py = y(v.value, values)
      if (!open) { segmentStart = px; segment = `M${px},${py} `; open = true }
      else segment += `L${px},${py} `
      lastX = px
    }
  })
  flush()
  return result
}
let controller: AbortController | undefined
watch(() => props.refreshToken, async () => {
  controller?.abort(); const current = new AbortController(); controller = current; error.value = false
  try {
    const result = await getNetworkSeries(current.signal)
    if (current === controller && !current.signal.aborted) {
      data.value = result
      if (!instances.value.includes(selected.value)) selected.value = instances.value[0] ?? ''
    }
  } catch { if (current === controller && !current.signal.aborted) error.value = true }
}, { immediate: true })
onUnmounted(() => { controller?.abort(); controller = undefined })
</script>
