<template>
  <article class="mito-model-card" :data-model="model.name" :data-group-id="group.id">
    <header class="mito-model-card-head">
      <span class="mito-model-card-icon" aria-hidden="true">
        <ModelIcon :model="iconName" size="30px" />
      </span>
      <h3>{{ model.name }}</h3>
      <span v-if="group.is_exclusive" class="mito-model-exclusive">{{ t('modelPlaza.badges.exclusive') }}</span>
    </header>

    <div class="mito-model-card-body">
      <div class="mito-model-price-heading">
        <span>{{ t('modelPlaza.catalog.standardPrice') }}</span>
        <span>{{ tokenBilling ? t('modelPlaza.table.unitPerMillion') : 'USD' }}</span>
      </div>
      <div class="mito-model-price-panel">
        <p v-if="!rows.length" class="mito-model-no-price">{{ t('modelPlaza.detail.noPricing') }}</p>
        <template v-else>
          <p v-if="hasTiers" class="mito-model-tier-heading">{{ t('modelPlaza.catalog.tiered') }}</p>
          <div v-for="(row, index) in rows" :key="index" class="mito-model-price-tier" :class="{ 'is-tiered': hasTiers }">
            <p v-if="row.interval" class="mito-model-tier-label" :title="tierHint">
              {{ catalogTierLabel(row.interval) }}<span v-if="tokenBilling"> tokens</span>
            </p>
            <template v-if="tokenBilling">
              <dl class="mito-model-price-grid" :class="{ 'has-cache': row.cache_read_price != null }">
                <div>
                  <dt>{{ t('modelPlaza.table.input') }}</dt>
                  <dd>{{ catalogPrice(row.input_price, rate) }}</dd>
                </div>
                <div>
                  <dt>{{ t('modelPlaza.table.output') }}</dt>
                  <dd>{{ catalogPrice(row.output_price, rate) }}</dd>
                </div>
                <div v-if="row.cache_read_price != null">
                  <dt>{{ t('modelPlaza.catalog.cacheRead') }}</dt>
                  <dd>{{ catalogPrice(row.cache_read_price, rate) }}</dd>
                </div>
              </dl>
              <dl v-if="hasCacheWrite(row)" class="mito-model-cache-write">
                <template v-for="field in cacheWriteFields" :key="field.key">
                  <div v-if="row[field.key] != null">
                    <dt>{{ t(field.label) }}{{ field.suffix }}</dt>
                    <dd>{{ catalogPrice(row[field.key], rate) }}</dd>
                  </div>
                </template>
              </dl>
            </template>
            <dl v-else class="mito-model-request-price">
              <dt>{{ t(mode === BILLING_MODE_IMAGE ? 'modelPlaza.table.perImage' : 'modelPlaza.table.perRequest') }}</dt>
              <dd>
                {{ catalogPrice(row.per_request_price, rate, false) }}
                <span>{{ t(mode === BILLING_MODE_IMAGE ? 'modelPlaza.table.perUnitImage' : 'modelPlaza.table.perUnitRequest') }}</span>
              </dd>
            </dl>
          </div>
        </template>
      </div>

      <div class="mito-model-group-line">
        <span :title="group.name">{{ group.name }}</span>
        <span class="mito-model-rate" :title="t('modelPlaza.table.rate')">
          <del v-if="hasPersonalRate">{{ group.rate_multiplier }}×</del>
          {{ rate }}×
        </span>
      </div>
      <p class="mito-model-card-description" :title="description">{{ description }}</p>
      <p v-if="specialPricing" class="mito-model-pricing-note">
        <Icon name="infoCircle" size="xs" />{{ t('modelPlaza.catalog.specialPricing') }}
      </p>
    </div>

    <footer class="mito-model-card-footer">
      <div class="mito-model-tags">
        <span>{{ t(`modelPlaza.catalog.tags.${category}`) }}</span>
        <span v-if="hasTiers">{{ t('modelPlaza.catalog.tiered') }}</span>
        <span v-if="group.subscription_type === 'subscription'">{{ t('modelPlaza.badges.subscription') }}</span>
        <span v-if="model.long_context_basis === 'marginal'" :title="tierHint">{{ t('modelPlaza.table.marginalBadge') }}</span>
        <span v-if="model.time_pricing?.periods.length">{{ t('modelPlaza.catalog.timePricing') }}</span>
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
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'
import { BILLING_MODE_IMAGE, BILLING_MODE_TOKEN, BILLING_MODE_VIDEO } from '@/constants/channel'
import { hasPeakRate } from '@/utils/peak-rate'
import { catalogBillingMode, catalogCategory, catalogPrice, catalogPriceRows, catalogRate, catalogTierLabel, type CatalogPriceRow } from './modelCatalog'

const props = defineProps<{ model: PlazaModel; group: ModelPlazaGroup }>()
defineEmits<{ (event: 'details'): void }>()
const { t } = useI18n()
const mode = computed(() => catalogBillingMode(props.model))
const tokenBilling = computed(() => mode.value === BILLING_MODE_TOKEN)
const rate = computed(() => catalogRate(props.model, props.group))
const rows = computed(() => catalogPriceRows(props.model))
const category = computed(() => catalogCategory(props.model))
const hasTiers = computed(() => rows.value.some(row => row.interval))
const independentRate = computed(() => (mode.value === BILLING_MODE_IMAGE && props.group.image_rate_independent)
  || (mode.value === BILLING_MODE_VIDEO && props.group.video_rate_independent))
const hasPersonalRate = computed(() => !independentRate.value && props.group.user_rate_multiplier != null
  && props.group.user_rate_multiplier !== props.group.rate_multiplier)
const tierHint = computed(() => t(props.model.long_context_basis === 'marginal' ? 'modelPlaza.table.tierHintMarginal' : 'modelPlaza.table.tierHint'))
const description = computed(() => props.group.description
  ? t('modelPlaza.catalog.groupDescription', { description: props.group.description })
  : t('modelPlaza.catalog.priceDescription'))
const specialPricing = computed(() => hasPeakRate(props.group) || (props.model.time_pricing?.periods.length ?? 0) > 0
  || Object.values(props.model.pricing?.reasoning_effort_multipliers ?? {}).some(value => Number.isFinite(value) && value > 0 && value !== 1))
// A distilled DeepSeek model can include another family's name; retain its leading brand.
const iconName = computed(() => /(?:^|\/)deepseek/i.test(props.model.name) ? 'deepseek' : props.model.name)
const cacheWriteFields = [
  { key: 'cache_write_price', label: 'modelPlaza.catalog.cacheWrite', suffix: '' },
  { key: 'cache_write_1h_price', label: 'modelPlaza.catalog.cacheWrite', suffix: ' 1h' }
] as const
function hasCacheWrite(row: CatalogPriceRow) {
  return cacheWriteFields.some(field => row[field.key] != null)
}
</script>
