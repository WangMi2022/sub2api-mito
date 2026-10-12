<template>
  <div class="mito-chart-grid" :aria-busy="loading">
    <section class="mito-panel mito-account-panel">
      <header class="mito-panel-heading"><h2><Icon name="creditCard" size="sm" />{{ text('account') }}</h2><p>{{ text('accountDescription') }}</p></header>
      <div class="mito-account-body">
        <div class="mito-account-summary">
          <div><strong>{{ user?.username || user?.email?.split('@')[0] }}</strong><p>{{ t('admin.users.roles.' + (user?.role || 'user')) }}</p></div>
          <div v-if="!auth.isSimpleMode" class="mito-account-balance"><span>{{ t('dashboard.balance') }}</span><strong>{{ money(user?.balance || 0, 2) }}</strong></div>
        </div>
        <nav class="mito-account-shortcuts" :aria-label="text('account')">
          <router-link to="/keys"><Icon name="key" size="md" /><span>{{ text('keys') }}</span><Icon name="chevronRight" size="sm" /></router-link>
          <router-link to="/usage"><Icon name="chart" size="md" /><span>{{ text('usage') }}</span><Icon name="chevronRight" size="sm" /></router-link>
        </nav>
      </div>
      <router-link to="/profile" class="mito-panel-footer">{{ t('nav.profile') }}<Icon name="chevronRight" size="sm" /></router-link>
    </section>
    <section class="mito-panel">
      <header class="mito-panel-heading"><h2><Icon name="dollar" size="sm" class="mito-green-text" />{{ text('cost') }}</h2><p>{{ text('costDescription') }}</p></header>
      <div class="mito-chart-body">
        <LoadingSpinner v-if="loading" />
        <Line v-else-if="trend.length" :data="costData" :options="costOptions" :plugins="costTooltip.plugins" role="img" :aria-label="text('cost')" />
        <p v-else class="mito-empty">{{ text('noData') }}</p>
      </div>
    </section>
    <section class="mito-panel mito-panel--large">
      <header class="mito-panel-heading"><h2>{{ text('models') }}</h2><p>{{ text('modelsDescription') }}</p></header>
      <div class="mito-chart-body">
        <LoadingSpinner v-if="loading" />
        <Bar v-else-if="models.length" :data="modelData" :options="modelOptions" :plugins="modelTooltip.plugins" role="img" :aria-label="text('models')" />
        <p v-else class="mito-empty">{{ text('noData') }}</p>
      </div>
      <details v-if="models.length" class="mito-model-details"><summary>{{ text('details') }}</summary>
        <div class="table-wrapper"><table class="table"><thead><tr><th>{{ t('dashboard.model') }}</th><th>{{ t('dashboard.requests') }}</th><th>Tokens</th><th>{{ text('actual') }}</th><th>{{ text('billing') }}</th></tr></thead>
          <tbody><tr v-for="model in models" :key="model.model"><td>{{ model.model }}</td><td>{{ model.requests.toLocaleString() }}</td><td>{{ model.total_tokens.toLocaleString() }}</td><td>{{ money(model.actual_cost) }}</td><td>{{ money(model.cost) }}</td></tr></tbody>
        </table></div>
      </details>
    </section>
    <section class="mito-panel mito-panel--large">
      <header class="mito-panel-heading"><h2><Icon name="chart" size="sm" class="mito-blue-text" />{{ text('requests') }}</h2><p>{{ text('requestsDescription') }}</p></header>
      <div class="mito-chart-body">
        <LoadingSpinner v-if="loading" />
        <Bar v-else-if="trend.length" :data="requestsData" :options="requestOptions" :plugins="requestTooltip.plugins" role="img" :aria-label="text('requests')" />
        <p v-else class="mito-empty">{{ text('noData') }}</p>
      </div>
    </section>
  </div>
  <TokenUsageTrend :trend-data="trend" :loading="loading" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Line, Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler, type ChartOptions } from 'chart.js'
import { useAuthStore } from '@/stores/auth'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import TokenUsageTrend from '@/components/charts/TokenUsageTrend.vue'
import type { TrendDataPoint, ModelStat } from '@/types'
import { useMitoLabels } from './labels'
import { useThemeSync } from './useThemeSync'
import { useChartTooltip } from './useChartTooltip'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)
const props = defineProps<{ loading: boolean, trend: TrendDataPoint[], models: ModelStat[] }>()
const { t } = useI18n()
const text = useMitoLabels()
const auth = useAuthStore()
const user = computed(() => auth.user)
const dark = ref(document.documentElement.classList.contains('dark'))
useThemeSync(dark)
const costTooltip = useChartTooltip<'line'>()
const modelTooltip = useChartTooltip<'bar'>()
const requestTooltip = useChartTooltip<'bar'>()
const money = (value: number, digits = 4) => `$${Number(value || 0).toFixed(digits)}`
const labels = computed(() => props.trend.map(point => point.date))
const costData = computed(() => ({ labels: labels.value, datasets: [{
  label: text('actual'), data: props.trend.map(point => point.actual_cost), borderColor: '#1fa390',
  backgroundColor: dark.value ? 'rgba(31,163,144,.12)' : 'rgba(31,163,144,.04)',
  borderWidth: 2.5, pointRadius: 2.5, pointHoverRadius: 5, pointBorderColor: dark.value ? '#0f172a' : '#fff', fill: true, tension: 0.3
}] }))
const requestsData = computed(() => ({ labels: labels.value, datasets: [{
  label: t('dashboard.requests'), data: props.trend.map(point => point.requests), backgroundColor: '#2563eb', borderRadius: 5, maxBarThickness: 28
}] }))
const ranked = computed(() => [...props.models].sort((a, b) => b.requests - a.requests).slice(0, 8))
const modelData = computed(() => ({ labels: ranked.value.map(model => model.model), datasets: [{
  label: t('dashboard.requests'), data: ranked.value.map(model => model.requests), backgroundColor: '#2563eb', borderRadius: 5, maxBarThickness: 22
}] }))
const tickColor = computed(() => dark.value ? '#94a3b8' : '#64748b')
const gridColor = computed(() => dark.value ? '#1e293b' : '#e8eef6')
const scales = computed(() => ({
  x: { grid: { display: false }, border: { display: false }, ticks: { color: tickColor.value, maxTicksLimit: 6, maxRotation: 0, font: { family: 'Outfit', size: 11 } } },
  y: { beginAtZero: true, grid: { color: gridColor.value }, border: { display: false }, ticks: { color: tickColor.value, maxTicksLimit: 5, padding: 12, font: { family: 'Outfit', size: 11 } } }
}))
const costOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true, maintainAspectRatio: false, animation: false,
  interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { enabled: false, external: costTooltip.external, callbacks: { label: context => money(context.parsed.y || 0) } } },
  scales: { ...scales.value, y: { ...scales.value.y, ticks: { ...scales.value.y.ticks, callback: value => `$${value}` } } }
}))
const requestOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { enabled: false, external: requestTooltip.external } },
  scales: { ...scales.value, y: { ...scales.value.y, ticks: { ...scales.value.y.ticks, precision: 0 } } }
}))
const modelOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true, maintainAspectRatio: false, animation: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { enabled: false, external: modelTooltip.external } },
  scales: {
    x: { ...scales.value.y, ticks: { ...scales.value.y.ticks, precision: 0 } },
    y: { ...scales.value.x, ticks: { color: tickColor.value, font: { family: 'Outfit', size: 11 } } }
  }
}))
</script>
