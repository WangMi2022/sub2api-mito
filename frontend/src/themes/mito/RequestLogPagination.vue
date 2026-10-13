<template>
  <div class="mito-log-pagination">
    <div class="mito-log-page-size">
      <span>{{ label('page') }} {{ page }} / {{ totalPages }}</span>
      <span :id="sizeId">{{ label('perPage') }}</span>
      <div class="mito-page-size-segments" role="group" :aria-labelledby="sizeId">
        <button v-for="size in sizes" :key="size" type="button" :aria-pressed="pageSize === size" :disabled="disabled" @click="setSize(size)">{{ size }}</button>
      </div>
      <input
        class="mito-page-size-slider"
        type="range"
        :aria-labelledby="sizeId"
        :aria-valuetext="String(pageSize)"
        min="0"
        :max="sizes.length - 1"
        step="1"
        :value="Math.max(0, sizes.indexOf(pageSize))"
        :disabled="disabled || sizes.length < 2"
        @change="setSize(sizes[Number(($event.target as HTMLInputElement).value)])"
      >
      <span>{{ pageSize }}</span>
    </div>
    <nav :aria-label="label('pagination')">
      <button type="button" :disabled="disabled || page <= 1" @click="$emit('update:page', page - 1)">
        <Icon name="chevronLeft" size="xs" aria-hidden="true" />{{ t('pagination.previous') }}
      </button>
      <template v-for="item in pages" :key="item.key">
        <button v-if="item.page" type="button" :aria-label="label('page') + ' ' + item.page" :aria-current="page === item.page ? 'page' : undefined" :disabled="disabled" @click="$emit('update:page', item.page)">{{ item.page }}</button>
        <span v-else aria-hidden="true">…</span>
      </template>
      <button type="button" :disabled="disabled || page >= totalPages" @click="$emit('update:page', page + 1)">
        {{ t('pagination.next') }}<Icon name="chevronRight" size="xs" aria-hidden="true" />
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { getConfiguredTablePageSizeOptions } from '@/utils/tablePreferences'
import { setPersistedPageSize } from '@/composables/usePersistedPageSize'
import { useMitoLabels } from './labels'

const props = defineProps<{ page: number; total: number; pageSize: number; disabled?: boolean }>()
const emit = defineEmits<{ 'update:page': [page: number]; 'update:pageSize': [size: number] }>()
const { t } = useI18n()
const label = useMitoLabels()
const sizeId = 'mito-page-size-' + useId()
// Respect the site's configured sizes instead of silently imposing new limits.
const sizes = computed(() => [...new Set([...getConfiguredTablePageSizeOptions(), props.pageSize])].sort((a, b) => a - b))
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const pages = computed(() => {
  const values = new Set([1, totalPages.value])
  const start = Math.max(1, Math.min(props.page - 2, totalPages.value - 4))
  for (let page = start; page <= Math.min(totalPages.value, start + 4); page++) values.add(page)
  const result: { key: string; page?: number }[] = []
  let previous = 0
  for (const page of [...values].sort((a, b) => a - b)) {
    if (page - previous > 1) result.push({ key: 'gap-' + page })
    result.push({ key: String(page), page })
    previous = page
  }
  return result
})
function setSize(size: number | undefined) {
  if (!size || size === props.pageSize || props.disabled) return
  setPersistedPageSize(size)
  emit('update:pageSize', size)
}
</script>
