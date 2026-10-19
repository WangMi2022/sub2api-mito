<template>
  <div class="mito-model-catalog">
    <p class="mito-catalog-caption">{{ t('modelPlaza.catalog.priceHint') }}</p>
    <section v-for="section in sections" :key="section.category" class="mito-catalog-section" :aria-labelledby="`${id}-${section.category}`">
      <header class="mito-catalog-section-head">
        <h2 :id="`${id}-${section.category}`">{{ t(`modelPlaza.catalog.categories.${section.category}`) }}</h2>
        <span class="mito-catalog-count" :aria-label="t('modelPlaza.catalog.offerCount', { count: section.entries.length })">({{ section.entries.length }})</span>
      </header>
      <div class="mito-model-grid">
        <ModelCatalogCard v-for="entry in section.entries" :key="entry.key" :model="entry.model" :group="entry.group" @details="selectedKey = entry.key" />
      </div>
    </section>
    <div v-for="group in emptyGroups" :key="group.id" class="mito-catalog-empty-group">
      <h2>{{ group.name }}</h2>
      <p>{{ t('modelPlaza.detail.noModels') }}</p>
    </div>
    <BaseDialog :show="!!selected" :title="selected?.model.name ?? ''" width="extra-wide" body-class="mito-catalog-detail" @close="selectedKey = null">
      <PlazaGroupSection v-if="selected" :group="{ ...selected.group, models: [selected.model] }" />
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import PlazaGroupSection from '@/components/modelPlaza/PlazaGroupSection.vue'
import type { ModelPlazaGroup } from '@/api/modelPlaza'
import ModelCatalogCard from './ModelCatalogCard.vue'
import { catalogSections } from './modelCatalog'

const props = defineProps<{ groups: ModelPlazaGroup[] }>()
const { t } = useI18n()
const id = useId()
const sections = computed(() => catalogSections(props.groups))
const emptyGroups = computed(() => props.groups.filter(group => !group.models.length))
const selectedKey = ref<string | null>(null)
// A refreshed/filtered response must not leave a stale or no-longer-visible offer open.
const selected = computed(() => sections.value.flatMap(section => section.entries).find(entry => entry.key === selectedKey.value))
watch(selected, entry => {
  if (!entry) selectedKey.value = null
})
</script>
