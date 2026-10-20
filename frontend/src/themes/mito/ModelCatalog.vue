<template>
  <div class="mito-model-catalog">
    <header class="mito-market-hero">
      <h1>{{ t('modelPlaza.title') }}</h1>
      <p class="mito-market-total">{{ t('modelPlaza.market.total', { count: entries.length }) }}</p>
      <p class="mito-market-subtitle">{{ t('modelPlaza.market.subtitle') }}</p>
      <div class="mito-market-search">
        <Icon name="search" size="md" />
        <input ref="searchInput" v-model="query" type="search" :placeholder="t('modelPlaza.market.search')" :aria-label="t('modelPlaza.market.search')" />
        <kbd aria-hidden="true">⌘K</kbd>
      </div>
    </header>
    <p v-if="anonymous" class="mito-market-notice">{{ t('modelPlaza.market.loginHint') }}</p>
    <p v-if="monitoringUnavailable" class="mito-market-notice is-warning" role="status">{{ t('modelPlaza.market.monitorUnavailable') }}</p>
    <div v-if="loading" class="mito-market-message" role="status"><Icon name="refresh" size="md" />{{ t('common.loading') }}</div>
    <div v-else-if="error" class="mito-market-message" role="alert">{{ t('modelPlaza.loadFailed') }}<button type="button" @click="$emit('refresh')">{{ t('modelPlaza.market.retry') }}</button></div>
    <div v-else class="mito-market-layout">
      <aside class="mito-market-filters" :class="{ 'is-open': mobileFilters }" :aria-label="t('modelPlaza.market.filters')">
        <div class="mito-market-filter-heading">
          <div><h2>{{ t('modelPlaza.market.filters') }}</h2><p>{{ t('modelPlaza.market.filterHint') }}</p></div>
          <button type="button" class="mito-market-filter-toggle" :aria-expanded="mobileFilters" aria-controls="mito-market-facets" @click="mobileFilters = !mobileFilters">{{ t(mobileFilters ? 'modelPlaza.market.collapse' : 'modelPlaza.market.expand') }}<Icon name="chevronDown" size="xs" /></button>
          <button type="button" class="mito-market-reset" @click="reset"><Icon name="refresh" size="xs" />{{ t('modelPlaza.market.reset') }}</button>
        </div>
        <div id="mito-market-facets" class="mito-market-facet-list">
        <details v-for="facet in facets" :key="facet.id" class="mito-market-facet" open>
          <summary>{{ t(`modelPlaza.market.facets.${facet.id}`) }}<Icon name="chevronDown" size="xs" /></summary>
          <div class="mito-market-chips">
            <button type="button" :class="{ 'is-active': !filters[facet.id] }" :aria-pressed="!filters[facet.id]" @click="filters[facet.id] = ''">{{ t(`modelPlaza.market.all.${facet.id}`) }}<span>{{ entries.length }}</span></button>
            <button v-for="option in facet.options" :key="option.value" type="button" :class="{ 'is-active': filters[facet.id] === option.value }" :aria-pressed="filters[facet.id] === option.value" @click="filters[facet.id] = filters[facet.id] === option.value ? '' : option.value">
              <ModelIcon v-if="option.icon" :model="option.icon" size="14px" />{{ option.label }}<span>{{ option.count }}</span>
            </button>
          </div>
        </details>
        </div>
      </aside>
      <section class="mito-market-results" :aria-label="t('modelPlaza.title')">
        <div class="mito-market-toolbar">
          <p aria-live="polite"><strong>{{ filtered.length }}</strong> {{ t('modelPlaza.market.models') }}</p>
          <div class="mito-market-tools">
            <div class="mito-market-segment" :aria-label="t('modelPlaza.market.priceDisplay')" role="group">
              <button v-for="display in priceDisplays" :key="display" type="button" :aria-pressed="priceDisplay === display" :title="t(`modelPlaza.market.priceHint.${display}`)" @click="priceDisplay = display">{{ t(`modelPlaza.market.prices.${display}`) }}</button>
            </div>
            <div class="mito-market-segment" :aria-label="t('modelPlaza.market.unit')" role="group">
              <button v-for="value in [1_000_000, 1000]" :key="value" type="button" :aria-pressed="unit === value" @click="unit = value">/{{ value === 1000 ? '1K' : '1M' }}</button>
            </div>
            <button type="button" class="mito-market-sort" :aria-label="t(ascending ? 'modelPlaza.market.sortAscending' : 'modelPlaza.market.sortDescending')" @click="ascending = !ascending"><Icon name="sort" size="sm" />{{ t('modelPlaza.market.name') }}<span>{{ ascending ? '↑' : '↓' }}</span></button>
            <div class="mito-market-segment mito-market-views" :aria-label="t('modelPlaza.market.view')" role="group">
              <button type="button" :aria-pressed="!list" :aria-label="t('modelPlaza.market.cards')" :title="t('modelPlaza.market.cards')" @click="list = false"><Icon name="grid" size="sm" /></button>
              <button type="button" :aria-pressed="list" :aria-label="t('modelPlaza.market.list')" :title="t('modelPlaza.market.list')" @click="list = true"><Icon name="menu" size="sm" /></button>
            </div>
          </div>
        </div>
        <div v-if="filtered.length" class="mito-model-grid" :class="{ 'is-list': list }">
          <ModelCatalogCard v-for="entry in filtered" :key="entry.key" :model="entry.model" :group="entry.group" :unit="unit" :price-display="priceDisplay" @details="selectedKey = entry.key" />
        </div>
        <div v-else class="mito-market-message">
          <Icon name="search" size="lg" /><p>{{ entries.length ? t('modelPlaza.noSearchResult') : t('modelPlaza.empty') }}</p>
          <button v-if="entries.length" type="button" @click="reset">{{ t('modelPlaza.market.reset') }}</button>
        </div>
        <p class="mito-catalog-caption">{{ t(`modelPlaza.market.priceHint.${priceDisplay}`) }} {{ t('modelPlaza.market.offerHint') }}</p>
        <div v-for="group in emptyGroups" :key="group.id" class="mito-catalog-empty-group"><h2>{{ group.name }}</h2><p>{{ t('modelPlaza.detail.noModels') }}</p></div>
      </section>
    </div>
    <BaseDialog :show="!!selected" :title="selected?.model.name ?? ''" width="extra-wide" body-class="mito-catalog-detail" @close="selectedKey = null">
      <ModelMonitorStrip v-if="selected?.model.monitoring" :monitor="selected.model.monitoring" />
      <PlazaGroupSection v-if="selected" :group="{ ...selected.group, models: [selected.model] }" />
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Icon from '@/components/icons/Icon.vue'
import ModelIcon from '@/components/common/ModelIcon.vue'
import PlazaGroupSection from '@/components/modelPlaza/PlazaGroupSection.vue'
import type { ModelPlazaGroup } from '@/api/modelPlaza'
import ModelCatalogCard from './ModelCatalogCard.vue'
import ModelMonitorStrip from './ModelMonitorStrip.vue'
import { catalogBillingMode, catalogCategory, catalogSections, catalogVendor, type CatalogEntry, type CatalogPriceDisplay } from './modelCatalog'

const props = defineProps<{ groups: ModelPlazaGroup[]; loading?: boolean; error?: boolean; anonymous?: boolean; monitoringUnavailable?: boolean }>()
defineEmits<{ (event: 'refresh'): void }>()
const { t } = useI18n()
const entries = computed(() => catalogSections(props.groups).flatMap(section => section.entries))
const emptyGroups = computed(() => props.groups.filter(group => !group.models.length))
const query = ref(''), searchInput = ref<HTMLInputElement | null>(null)
const unit = ref(1_000_000), priceDisplay = ref<CatalogPriceDisplay>('effective')
const priceDisplays: CatalogPriceDisplay[] = ['standard', 'effective']
const ascending = ref(true), list = ref(false), mobileFilters = ref(false)
const filters = reactive({ group: '', vendor: '', tag: '', billing: '', endpoint: '' })
type Facet = keyof typeof filters
const facetIds: Facet[] = ['group', 'vendor', 'tag', 'billing', 'endpoint']
function value(entry: CatalogEntry, id: Facet): string {
  return ({ group: String(entry.group.id), vendor: catalogVendor(entry.model).id, tag: catalogCategory(entry.model), billing: catalogBillingMode(entry.model), endpoint: entry.model.platform })[id]
}
const facets = computed(() => facetIds.map(id => {
  const options = new Map<string, { value: string; label: string; icon?: string; count: number }>()
  for (const entry of entries.value) {
    const key = value(entry, id), vendor = catalogVendor(entry.model)
    const label = id === 'group' ? entry.group.name : id === 'vendor' ? vendor.name || t('modelPlaza.market.unknownVendor')
      : id === 'tag' ? t(`modelPlaza.catalog.tags.${key}`) : id === 'billing' ? t(`modelPlaza.market.billing.${key}`) : entry.model.platform
    const previous = options.get(key)
    if (previous) previous.count++
    else options.set(key, { value: key, label, count: 1, icon: id === 'vendor' ? vendor.icon : undefined })
  }
  return { id, options: [...options.values()] }
}))
const filtered = computed(() => {
  const search = query.value.trim().toLowerCase()
  return entries.value.filter(entry => facetIds.every(id => !filters[id] || filters[id] === value(entry, id))
    && (!search || [entry.model.name, entry.group.name, catalogVendor(entry.model).name, entry.model.platform, t(`modelPlaza.catalog.tags.${catalogCategory(entry.model)}`)].some(text => text.toLowerCase().includes(search))))
    .sort((a, b) => (ascending.value ? 1 : -1) * a.model.name.localeCompare(b.model.name) || a.group.id - b.group.id)
})
watch(facets, current => {
  for (const facet of current) if (filters[facet.id] && !facet.options.some(option => option.value === filters[facet.id])) filters[facet.id] = ''
})
function reset() { query.value = ''; for (const id of facetIds) filters[id] = '' }
const selectedKey = ref<string | null>(null)
const selected = computed(() => filtered.value.find(entry => entry.key === selectedKey.value))
watch(selected, entry => { if (!entry) selectedKey.value = null })
function shortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !selected.value) {
    event.preventDefault(); event.stopImmediatePropagation(); searchInput.value?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', shortcut, true))
onBeforeUnmount(() => window.removeEventListener('keydown', shortcut, true))
</script>
