<template>
  <div class="mito-stats">
    <div class="mito-stats-grid">
      <article v-if="!isSimple" class="mito-stat mito-stat--blue">
        <div class="mito-stat-label"><Icon name="creditCard" size="sm" />{{ t('dashboard.balance') }}</div>
        <div class="mito-stat-value">{{ money(balance, 2) }}</div>
        <div class="mito-stat-note">{{ t('common.available') }}</div>
      </article>
      <article class="mito-stat">
        <div class="mito-stat-label"><Icon name="chart" size="sm" />{{ t('dashboard.todayCost') }}<span class="mito-stat-count">{{ number(stats.today_requests) }} {{ t('dashboard.requests') }}</span></div>
        <div class="mito-stat-value">{{ money(stats.today_actual_cost) }}</div>
        <div class="mito-stat-split"><span>{{ text('billing') }}</span><strong>{{ money(stats.today_cost) }}</strong></div>
      </article>
      <article class="mito-stat">
        <div class="mito-stat-label"><Icon name="key" size="sm" />{{ t('dashboard.apiKeys') }}</div>
        <div class="mito-stat-value">{{ number(stats.total_api_keys) }}</div>
        <div class="mito-stat-note">{{ number(stats.active_api_keys) }} {{ t('common.active') }}</div>
      </article>
      <article class="mito-stat mito-stat--green">
        <div class="mito-stat-label"><Icon name="chart" size="sm" />{{ text('period') }} · {{ text('actual') }}</div>
        <div class="mito-stat-value">{{ money(stats.total_actual_cost) }}</div>
        <div class="mito-stat-note">{{ number(stats.total_requests) }} {{ t('dashboard.requests') }} · {{ tokens(stats.total_tokens) }} Tokens</div>
        <div class="mito-stat-note">{{ text('billing') }} {{ money(stats.total_cost) }}</div>
      </article>
    </div>
    <div class="mito-stats-grid mito-stats-grid--secondary">
      <article class="mito-stat mito-stat--mini">
        <div class="mito-stat-label"><svg class="mito-input-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M8 6h10v10" /></svg>{{ text('input') }}</div>
        <div class="mito-stat-value">{{ number(stats.today_input_tokens) }}</div>
        <div class="mito-stat-note">{{ text('period') }} {{ tokens(stats.total_input_tokens) }} · {{ text('cacheToday') }} {{ tokens(stats.today_cache_creation_tokens + stats.today_cache_read_tokens) }}</div>
        <div class="mito-stat-note">{{ text('cacheTotal') }} {{ tokens(stats.total_cache_creation_tokens + stats.total_cache_read_tokens) }}</div>
      </article>
      <article class="mito-stat mito-stat--mini">
        <div class="mito-stat-label"><svg class="mito-output-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M8 18h10V8" /></svg>{{ text('output') }}</div>
        <div class="mito-stat-value">{{ number(stats.today_output_tokens) }}</div>
        <div class="mito-stat-note">{{ text('period') }} {{ tokens(stats.total_output_tokens) }} · {{ t('dashboard.todayTokens') }} {{ tokens(stats.today_tokens) }}</div>
      </article>
      <article class="mito-stat mito-stat--mini">
        <div class="mito-stat-label"><Icon name="chart" size="sm" />{{ t('dashboard.performance') }}</div>
        <div class="mito-stat-value"><span class="mito-blue-text">{{ number(stats.rpm) }}</span><span class="mito-stat-unit"> RPM</span></div>
        <div class="mito-stat-note">{{ tokens(stats.tpm) }} TPM</div>
      </article>
      <article class="mito-stat mito-stat--mini">
        <div class="mito-stat-label"><Icon name="clock" size="sm" />{{ t('dashboard.avgResponse') }}</div>
        <div class="mito-stat-value">{{ duration(stats.average_duration_ms) }}</div>
        <div class="mito-stat-note">{{ t('dashboard.averageTime') }}</div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import type { UserDashboardStats } from '@/api/usage'
import { useMitoLabels } from './labels'
defineProps<{ stats: UserDashboardStats, balance: number, isSimple: boolean }>()
const { t } = useI18n()
const text = useMitoLabels()
const money = (value: number, digits = 4) => `$${Number(value || 0).toFixed(digits)}`
const number = (value: number) => Number(value || 0).toLocaleString()
const tokens = (value: number) => value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(1)}K` : number(value)
const duration = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Number(value || 0).toFixed(0)}ms`
</script>
