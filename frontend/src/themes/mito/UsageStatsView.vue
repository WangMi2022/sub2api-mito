<template>
  <AppLayout>
    <div class="mito-usage-stats space-y-4">
      <UsageFilters :state="usageFilters" @change="applyFilters">
        <template #actions>
          <div class="mito-log-actions">
            <button type="button" class="mito-log-button" @click="resetFilters">{{ t('common.reset') }}</button>
            <button type="button" class="mito-log-button mito-log-button-primary" :disabled="busy" @click="refreshData">
              <Icon name="refresh" size="sm" aria-hidden="true" :class="{ 'mito-is-refreshing': busy }" />{{ t('common.refresh') }}
            </button>
          </div>
        </template>
      </UsageFilters>
      <UsageStatsCards :stats="usageStats" :show-account-cost="false" :strike-standard-cost="true" />
      <div class="mito-stats-granularity">
        <label id="mito-stats-granularity-label">{{ t('admin.dashboard.granularity') }}</label>
        <Select v-model="granularity" :options="granularityOptions" aria-labelledby="mito-stats-granularity-label" @change="loadChartData" />
      </div>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ModelDistributionChart
            v-model:metric="modelDistributionMetric"
            :model-stats="requestedModelStats"
            :loading="modelStatsLoading"
            :show-source-toggle="false"
            :show-metric-toggle="true"
            :enable-breakdown="false"
            :show-account-cost="false"
            :start-date="startDate"
            :end-date="endDate"
          />
          <GroupDistributionChart
            v-model:metric="groupDistributionMetric"
            :group-stats="groupStats"
            :loading="chartsLoading"
            :show-metric-toggle="true"
            :enable-breakdown="false"
            :show-account-cost="false"
            :start-date="startDate"
            :end-date="endDate"
          />
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <EndpointDistributionChart
            v-model:source="endpointDistributionSource"
            v-model:metric="endpointDistributionMetric"
            :endpoint-stats="inboundEndpointStats"
            :upstream-endpoint-stats="upstreamEndpointStats"
            :endpoint-path-stats="endpointPathStats"
            :loading="endpointStatsLoading"
            :show-source-toggle="false"
            :show-metric-toggle="true"
            :enable-breakdown="false"
            :title="t('usage.endpointDistribution')"
            :start-date="startDate"
            :end-date="endDate"
          />
          <TokenUsageTrend :trend-data="trendData" :loading="chartsLoading" />
        </div>

    </div>
  </AppLayout>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usageAPI } from '@/api'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/layout/AppLayout.vue'
import UsageStatsCards from '@/components/admin/usage/UsageStatsCards.vue'
import Select, { type SelectOption } from '@/components/common/Select.vue'
import Icon from '@/components/icons/Icon.vue'
import ModelDistributionChart from '@/components/charts/ModelDistributionChart.vue'
import GroupDistributionChart from '@/components/charts/GroupDistributionChart.vue'
import EndpointDistributionChart from '@/components/charts/EndpointDistributionChart.vue'
import TokenUsageTrend from '@/components/charts/TokenUsageTrend.vue'
import type { EndpointStat, GroupStat, ModelStat, TrendDataPoint, UsageStatsResponse } from '@/types'
import UsageFilters from './UsageFilters.vue'
import { useUsageFilters, usageGranularity } from './useUsageFilters'

const { t } = useI18n()
const app = useAppStore()
const usageFilters = useUsageFilters()
const { startDate, endDate, normalizedFilters, validRange, rememberModels } = usageFilters
type DistributionMetric = 'tokens' | 'actual_cost'
type EndpointSource = 'inbound' | 'upstream' | 'path'

const usageStats = ref<UsageStatsResponse | null>(null)
const trendData = ref<TrendDataPoint[]>([])
const requestedModelStats = ref<ModelStat[]>([])
const groupStats = ref<GroupStat[]>([])
const inboundEndpointStats = ref<EndpointStat[]>([])
const upstreamEndpointStats = ref<EndpointStat[]>([])
const endpointPathStats = ref<EndpointStat[]>([])

const chartsLoading = ref(false)
const modelStatsLoading = ref(false)
const endpointStatsLoading = ref(false)

let chartReqSeq = 0
let statsReqSeq = 0
let modelStatsReqSeq = 0
const busy = computed(() => chartsLoading.value || modelStatsLoading.value || endpointStatsLoading.value)
const granularity = ref<'day' | 'hour'>(usageGranularity(startDate.value, endDate.value))
const modelDistributionMetric = ref<DistributionMetric>('tokens')
const groupDistributionMetric = ref<DistributionMetric>('tokens')
const endpointDistributionMetric = ref<DistributionMetric>('tokens')
const endpointDistributionSource = ref<EndpointSource>('inbound')
const granularityOptions = computed<SelectOption[]>(() => [
  { value: 'day', label: t('admin.dashboard.day') },
  { value: 'hour', label: t('admin.dashboard.hour') },
])
const loadStats = async () => {
  if (!validRange.value) return
  const seq = ++statsReqSeq
  endpointStatsLoading.value = true
  try {
    const stats = await usageAPI.getStats(normalizedFilters.value)
    if (seq !== statsReqSeq) return
    usageStats.value = stats
    inboundEndpointStats.value = stats.endpoints || []
    upstreamEndpointStats.value = []
    endpointPathStats.value = []
  } catch (error) {
    if (seq !== statsReqSeq) return
    app.showError(t('usage.failedToLoad'))
    console.error('Failed to load usage stats:', error)
    inboundEndpointStats.value = []
    upstreamEndpointStats.value = []
    endpointPathStats.value = []
  } finally {
    if (seq === statsReqSeq) endpointStatsLoading.value = false
  }
}

const loadModelStats = async () => {
  if (!validRange.value) return
  const seq = ++modelStatsReqSeq
  modelStatsLoading.value = true
  try {
    const response = await usageAPI.getDashboardModels({
      ...normalizedFilters.value,
      model_source: 'requested',
    })
    if (seq !== modelStatsReqSeq) return
    requestedModelStats.value = response.models || []
    rememberModels(response.models || [])
  } catch (error) {
    if (seq !== modelStatsReqSeq) return
    app.showError(t('usage.failedToLoad'))
    console.error('Failed to load model stats:', error)
    requestedModelStats.value = []
  } finally {
    if (seq === modelStatsReqSeq) modelStatsLoading.value = false
  }
}

const loadChartData = async () => {
  if (!validRange.value) return
  const seq = ++chartReqSeq
  chartsLoading.value = true
  try {
    const snapshot = await usageAPI.getDashboardSnapshotV2({
      ...normalizedFilters.value,
      granularity: granularity.value,
      include_trend: true,
      include_model_stats: false,
      include_group_stats: true,
    })
    if (seq !== chartReqSeq) return
    trendData.value = snapshot.trend || []
    groupStats.value = snapshot.groups || []
  } catch (error) {
    if (seq !== chartReqSeq) return
    app.showError(t('usage.failedToLoad'))
    console.error('Failed to load chart data:', error)
    trendData.value = []
    groupStats.value = []
  } finally {
    if (seq === chartReqSeq) chartsLoading.value = false
  }
}


function refreshData() {
  void loadStats()
  void loadModelStats()
  void loadChartData()
}
function applyFilters() {
  if (!validRange.value) return
  granularity.value = usageGranularity(startDate.value, endDate.value)
  refreshData()
}
function resetFilters() {
  usageFilters.reset()
  applyFilters()
}
onMounted(() => {
  void usageFilters.loadFilterOptions()
  refreshData()
})
onUnmounted(() => { chartReqSeq++; statsReqSeq++; modelStatsReqSeq++ })
</script>
