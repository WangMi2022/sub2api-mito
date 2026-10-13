<template>
  <section class="mito-usage-filters" :aria-label="label('filters')">
    <div class="mito-usage-filter-bar">
      <button
        type="button"
        class="mito-usage-filter-toggle"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        @click="expanded = !expanded"
      >
        <Icon name="filter" size="sm" aria-hidden="true" />
        {{ label('filters') }}
        <span v-if="count > 0" class="mito-filter-count">{{ count }} {{ label('selected') }}</span>
        <Icon name="chevronDown" size="sm" class="mito-filter-chevron" :class="{ 'is-open': expanded }" aria-hidden="true" />
      </button>
      <slot name="actions" />
    </div>
    <div v-show="expanded" :id="panelId" class="mito-usage-filter-grid">
      <slot>
        <div>
          <label class="input-label" :id="panelId + '-key'">{{ t('usage.apiKeyFilter') }}</label>
          <Select :model-value="state.filters.value.api_key_id" :aria-labelledby="panelId + '-key'" :options="state.apiKeyOptions.value" @update:model-value="state.setFilter('api_key_id', $event)" @change="$emit('change')" />
        </div>
        <div>
          <label class="input-label" :id="panelId + '-model'">{{ t('usage.model') }}</label>
          <Select :model-value="state.filters.value.model" :aria-labelledby="panelId + '-model'" :options="state.modelOptions.value" searchable creatable clearable @update:model-value="state.setFilter('model', $event)" @change="$emit('change')" />
        </div>
        <div>
          <label class="input-label" :id="panelId + '-group'">{{ t('admin.usage.group') }}</label>
          <Select :model-value="state.filters.value.group_id" :aria-labelledby="panelId + '-group'" :options="state.groupOptions.value" searchable @update:model-value="state.setFilter('group_id', $event)" @change="$emit('change')" />
        </div>
        <div>
          <label class="input-label" :id="panelId + '-type'">{{ t('usage.type') }}</label>
          <Select :model-value="state.filters.value.request_type" :aria-labelledby="panelId + '-type'" :options="state.requestTypeOptions.value" @update:model-value="state.setFilter('request_type', $event)" @change="$emit('change')" />
        </div>
        <div>
          <label class="input-label" :id="panelId + '-compaction'">{{ t('usage.compactionFilter') }}</label>
          <Select :model-value="state.filters.value.native_compaction_v2" :aria-labelledby="panelId + '-compaction'" :options="state.compactionOptions.value" @update:model-value="state.setFilter('native_compaction_v2', $event)" @change="$emit('change')" />
        </div>
        <div v-if="state.subscriptionFeatureEnabled.value">
          <label class="input-label" :id="panelId + '-billing-type'">{{ t('admin.usage.billingType') }}</label>
          <Select :model-value="state.filters.value.billing_type" :aria-labelledby="panelId + '-billing-type'" :options="state.billingTypeOptions.value" @update:model-value="state.setFilter('billing_type', $event)" @change="$emit('change')" />
        </div>
        <div>
          <label class="input-label" :id="panelId + '-billing-mode'">{{ t('admin.usage.billingMode') }}</label>
          <Select :model-value="state.filters.value.billing_mode" :aria-labelledby="panelId + '-billing-mode'" :options="state.billingModeOptions.value" @update:model-value="state.setFilter('billing_mode', $event)" @change="$emit('change')" />
        </div>
      </slot>
      <div>
        <label class="input-label" :for="panelId + '-start'">{{ label('startDate') }}</label>
        <input :id="panelId + '-start'" :value="state.startDate.value" class="input" type="date" :max="state.endDate.value" :aria-invalid="!state.validRange.value" @change="updateDate('start', $event)">
      </div>
      <div>
        <label class="input-label" :for="panelId + '-end'">{{ label('endDate') }}</label>
        <input :id="panelId + '-end'" :value="state.endDate.value" class="input" type="date" :min="state.startDate.value" :aria-invalid="!state.validRange.value" @change="updateDate('end', $event)">
      </div>
      <p v-if="!state.validRange.value" class="mito-filter-error" role="alert">{{ label('invalidRange') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from '@/components/common/Select.vue'
import Icon from '@/components/icons/Icon.vue'
import { useMitoLabels } from './labels'
import type { UsageFiltersState } from './useUsageFilters'

const props = defineProps<{ state: UsageFiltersState; selectedCount?: number }>()
const emit = defineEmits<{ change: [] }>()
const { t } = useI18n()
const label = useMitoLabels()
const panelId = 'mito-usage-filter-' + useId()
const expanded = ref(false)
const count = computed(() => props.selectedCount ?? props.state.selectedCount.value)
function updateDate(boundary: 'start' | 'end', event: Event) {
  props.state.setDate(boundary, (event.target as HTMLInputElement).value)
  emit('change')
}
</script>
