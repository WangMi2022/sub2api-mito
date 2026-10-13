<template>
  <div class="mito-filter-section" :class="{ 'mito-filter-section--collapsed': !visible }">
    <button
      v-if="isMitoTheme"
      type="button"
      class="mito-filter-toggle"
      :aria-expanded="visible"
      :aria-controls="panelId"
      @click="expanded = !expanded"
    >
      <Icon name="filter" size="sm" />
      <span class="mito-filter-title">{{ label('filters') }}</span>
      <span v-if="selectedCount" class="mito-filter-count">{{ selectedCount }} {{ label('selected') }}</span>
      <span class="mito-filter-toggle-label">{{ t(visible ? 'common.collapse' : 'common.expand') }}</span>
      <Icon name="chevronDown" size="sm" class="mito-filter-chevron" />
    </button>
    <slot v-bind="{ expanded: visible, panelId }" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { isMitoTheme } from './index'
import { useMitoLabels } from './labels'

withDefaults(defineProps<{ selectedCount?: number }>(), { selectedCount: 0 })

const { t } = useI18n()
const label = useMitoLabels()
const expanded = ref(false)
const visible = computed(() => !isMitoTheme || expanded.value)
const panelId = `mito-filters-${useId()}`
</script>
