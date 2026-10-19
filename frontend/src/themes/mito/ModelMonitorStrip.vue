<template>
  <div class="mito-model-monitor" :data-status="monitor.status">
    <div class="mito-monitor-history" :title="summary">
      <div class="mito-monitor-label"><span>{{ t('modelPlaza.market.status') }}</span><span>{{ availability }}</span></div>
      <div v-if="monitor.cells.some(cell => cell.status !== 'unknown')" class="mito-monitor-bars" role="img" :aria-label="summary">
        <span v-for="(cell, index) in monitor.cells" :key="index" :data-status="cell.status" :title="`${time(cell.at)} · ${t(`modelPlaza.market.states.${cell.status}`)}`"></span>
      </div>
      <span v-else class="mito-monitor-no-data">{{ t('modelPlaza.market.noSamples') }}</span>
    </div>
    <dl class="mito-monitor-metric" :title="t(monitor.latency_kind === 'probe' ? 'modelPlaza.market.probeHint' : 'modelPlaza.market.ttftHint')">
      <dt>{{ t('modelPlaza.market.latency') }}</dt><dd>{{ monitorLatency(monitor.latency_ms) }}</dd>
    </dl>
    <dl class="mito-monitor-metric" :title="t(monitor.throughput == null ? 'modelPlaza.market.throughputMissing' : 'modelPlaza.market.throughputHint')">
      <dt>{{ t('modelPlaza.market.throughput') }}</dt><dd>{{ monitorNumber(monitor.throughput, 1) }}<span v-if="monitor.throughput != null">t/s</span></dd>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { monitorLatency, monitorNumber, type PlazaMonitoring } from './plazaMonitor'

const props = defineProps<{ monitor: PlazaMonitoring }>()
const { t, locale } = useI18n()
const availability = computed(() => props.monitor.availability == null ? '—' : `${monitorNumber(props.monitor.availability)}%`)
function time(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale.value)
}
const summary = computed(() => [
  t(`modelPlaza.market.states.${props.monitor.status}`),
  t('modelPlaza.market.availabilityHint', { range: props.monitor.range, value: availability.value }),
  props.monitor.updated_at ? t('modelPlaza.market.updated', { time: time(props.monitor.updated_at) }) : t('modelPlaza.market.noSamples')
].join(' · '))
</script>
