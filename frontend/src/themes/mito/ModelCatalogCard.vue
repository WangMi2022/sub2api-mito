<template>
  <article class="mito-model-card" :data-model="model.name" :data-group-id="group.id">
    <header class="mito-model-card-head">
      <span class="mito-model-card-icon" aria-hidden="true"><ModelIcon :model="vendor.icon" size="28px" /></span>
      <div class="mito-model-identity">
        <h3 :title="model.name">{{ model.name }}</h3>
        <p>{{ vendor.name || t('modelPlaza.market.unknownVendor') }}</p>
      </div>
      <button type="button" class="mito-model-copy" :aria-label="t('modelPlaza.market.copy', { model: model.name })" :title="t('modelPlaza.market.copy', { model: model.name })" @click="copyToClipboard(model.name)">
        <Icon :name="copied ? 'check' : 'copy'" size="sm" />
      </button>
    </header>
    <p class="mito-model-card-description" :title="description">{{ description }}</p>
    <div class="mito-model-billing" :class="{ 'is-dynamic': hasTiers || specialPricing }">
      {{ t(`modelPlaza.market.billing.${mode}`) }}
      <span v-if="hasTiers"> · {{ t('modelPlaza.catalog.tiered') }}</span>
      <span v-else-if="specialPricing"> · {{ t('modelPlaza.catalog.timePricing') }}</span>
    </div>
    <div class="mito-model-card-prices">
      <p v-if="!row" class="mito-model-no-price">{{ t('modelPlaza.detail.noPricing') }}</p>
      <dl v-else-if="tokenBilling" class="mito-model-price-grid">
        <div v-for="field in tokenFields" :key="field">
          <dt>{{ t(`modelPlaza.table.${field}`) }}</dt>
          <dd>{{ catalogPrice(row[`${field}_price`], rate, true, unit) }} <span>/ {{ unit === 1000 ? '1K' : '1M' }}</span><small v-if="hasTiers">{{ t('modelPlaza.market.starting') }}</small></dd>
        </div>
      </dl>
      <dl v-else class="mito-model-price-grid">
        <div><dt>{{ t(mode === BILLING_MODE_IMAGE ? 'modelPlaza.table.perImage' : 'modelPlaza.table.perRequest') }}</dt>
          <dd>{{ catalogPrice(row.per_request_price, rate, false) }} <span>{{ t(mode === BILLING_MODE_IMAGE ? 'modelPlaza.table.perUnitImage' : 'modelPlaza.table.perUnitRequest') }}</span><small v-if="hasTiers">{{ t('modelPlaza.market.starting') }}</small></dd>
        </div>
      </dl>
    </div>
    <div class="mito-model-meta">
      <p :title="`${group.name} · ${catalogRate(model, group)}×`"><span>{{ t('modelPlaza.market.group') }}</span> {{ group.name }} <small>{{ catalogRate(model, group) }}×</small></p>
      <p :title="model.platform"><span>{{ t('modelPlaza.market.endpoint') }}</span> {{ model.platform }}</p>
    </div>
    <footer class="mito-model-card-footer" :class="{ 'has-monitor': !!model.monitoring }">
      <ModelMonitorStrip v-if="model.monitoring" :monitor="model.monitoring" />
      <div v-else class="mito-model-tags">
        <span>{{ t(`modelPlaza.catalog.tags.${category}`) }}</span>
        <span v-if="group.is_exclusive">{{ t('modelPlaza.badges.exclusive') }}</span>
        <span v-if="group.subscription_type === 'subscription'">{{ t('modelPlaza.badges.subscription') }}</span>
      </div>
      <button type="button" class="mito-model-details-button" :aria-label="t('modelPlaza.catalog.detailsFor', { model: model.name, group: group.name })" @click="$emit('details')">
        {{ t('modelPlaza.catalog.details') }}<Icon name="chevronRight" size="xs" />
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ModelIcon from '@/components/common/ModelIcon.vue'
import Icon from '@/components/icons/Icon.vue'
import { useClipboard } from '@/composables/useClipboard'
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'
import { BILLING_MODE_IMAGE, BILLING_MODE_TOKEN } from '@/constants/channel'
import { hasPeakRate } from '@/utils/peak-rate'
import ModelMonitorStrip from './ModelMonitorStrip.vue'
import { catalogBillingMode, catalogCategory, catalogPrice, catalogPriceRows, catalogRate, catalogVendor, type CatalogPriceDisplay } from './modelCatalog'

const props = withDefaults(defineProps<{ model: PlazaModel; group: ModelPlazaGroup; unit?: number; priceDisplay?: CatalogPriceDisplay }>(), { unit: 1_000_000, priceDisplay: 'effective' })
defineEmits<{ (event: 'details'): void }>()
const { t } = useI18n()
const { copied, copyToClipboard } = useClipboard()
const vendor = computed(() => catalogVendor(props.model))
const mode = computed(() => catalogBillingMode(props.model))
const tokenBilling = computed(() => mode.value === BILLING_MODE_TOKEN)
const rate = computed(() => props.priceDisplay === 'standard' ? 1 : catalogRate(props.model, props.group))
const rows = computed(() => catalogPriceRows(props.model))
const row = computed(() => rows.value[0])
const category = computed(() => catalogCategory(props.model))
const hasTiers = computed(() => rows.value.length > 1)
const description = computed(() => props.group.description
  ? t('modelPlaza.catalog.groupDescription', { description: props.group.description })
  : t('modelPlaza.market.noDescription'))
const specialPricing = computed(() => hasPeakRate(props.group) || (props.model.time_pricing?.periods.length ?? 0) > 0)
const tokenFields = ['input', 'output'] as const
</script>
