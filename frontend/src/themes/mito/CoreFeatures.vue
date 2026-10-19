<template>
  <section id="core-features" class="mito-core-section" :aria-labelledby="'mito-core-title'">
    <header class="mito-core-heading">
      <div class="mito-core-heading-text">
        <span class="mito-core-eyebrow">{{ t('home.mito.core.eyebrow') }}</span>
        <h2 id="mito-core-title" class="mito-core-title">{{ t('home.mito.core.title') }}</h2>
        <p class="mito-core-subtitle">{{ t('home.mito.core.subtitle') }}</p>
      </div>
      <router-link
        :to="isAuthenticated ? dashboardPath : '/login'"
        class="mito-core-entry"
      >
        {{ isAuthenticated ? t('home.goToDashboard') : t('home.getStarted') }}
        <Icon name="arrowRight" size="sm" />
      </router-link>
    </header>

    <div class="mito-core-grid">
      <article v-for="item in items" :key="item.id" class="mito-core-card">
        <div class="mito-core-card-top">
          <span class="mito-core-icon" :data-tone="item.tone" aria-hidden="true">
            <Icon :name="item.icon" size="lg" />
          </span>
          <span class="mito-core-index">{{ item.index }}</span>
        </div>
        <h3 class="mito-core-card-title">{{ t(item.titleKey) }}</h3>
        <p class="mito-core-card-desc">{{ t(item.descKey) }}</p>
        <ul class="mito-core-tags" :aria-label="t(item.titleKey)">
          <li v-for="tag in item.tags" :key="tag">{{ t(tag) }}</li>
        </ul>
      </article>
    </div>

    <dl class="mito-core-strip">
      <div v-for="fact in facts" :key="fact.key" class="mito-core-fact">
        <dt>{{ t(fact.labelKey) }}</dt>
        <dd>{{ t(fact.valueKey) }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

defineProps<{ isAuthenticated: boolean; dashboardPath: string }>()

const { t } = useI18n()

const items = [
  {
    id: 'gateway',
    index: '01',
    icon: 'server',
    tone: 'blue',
    titleKey: 'home.mito.core.items.gateway.title',
    descKey: 'home.mito.core.items.gateway.desc',
    tags: [
      'home.mito.core.items.gateway.tags.compatible',
      'home.mito.core.items.gateway.tags.key',
      'home.mito.core.items.gateway.tags.endpoint'
    ]
  },
  {
    id: 'routing',
    index: '02',
    icon: 'shield',
    tone: 'emerald',
    titleKey: 'home.mito.core.items.routing.title',
    descKey: 'home.mito.core.items.routing.desc',
    tags: [
      'home.mito.core.items.routing.tags.pool',
      'home.mito.core.items.routing.tags.failover',
      'home.mito.core.items.routing.tags.isolation'
    ]
  },
  {
    id: 'billing',
    index: '03',
    icon: 'chart',
    tone: 'violet',
    titleKey: 'home.mito.core.items.billing.title',
    descKey: 'home.mito.core.items.billing.desc',
    tags: [
      'home.mito.core.items.billing.tags.usage',
      'home.mito.core.items.billing.tags.quota',
      'home.mito.core.items.billing.tags.detail'
    ]
  }
] as const

const facts = [
  { key: 'key', labelKey: 'home.mito.core.facts.key.label', valueKey: 'home.mito.core.facts.key.value' },
  { key: 'sdk', labelKey: 'home.mito.core.facts.sdk.label', valueKey: 'home.mito.core.facts.sdk.value' },
  { key: 'route', labelKey: 'home.mito.core.facts.route.label', valueKey: 'home.mito.core.facts.route.value' },
  { key: 'billing', labelKey: 'home.mito.core.facts.billing.label', valueKey: 'home.mito.core.facts.billing.value' }
] as const
</script>
