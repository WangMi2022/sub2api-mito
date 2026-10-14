<template>
  <div>
    <label class="input-label">{{ label ?? t('admin.userGroups.fieldLabel') }}</label>
    <Select
      :model-value="modelValue"
      :options="options"
      searchable
      clearable
      :placeholder="placeholder ?? t('admin.userGroups.fieldPlaceholder')"
      @change="onChange"
    />
    <p class="input-hint">{{ hint ?? t('admin.userGroups.fieldHint') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import type { UserGroup } from '@/types'
import Select from '@/components/common/Select.vue'

defineProps<{
  modelValue: number | null | undefined
  label?: string
  placeholder?: string
  hint?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const { t } = useI18n()
const groups = ref<UserGroup[]>([])

const options = computed(() => [
  { value: null as number | null, label: t('admin.userGroups.ungroupedOption') },
  ...groups.value.map(g => ({
    value: g.id as number | null,
    label: g.is_system ? `${g.name}（${t('admin.userGroups.systemBadge')}）` : g.name
  }))
])

const onChange = (value: unknown) => {
  emit('update:modelValue', value == null || value === '' ? null : Number(value))
}

onMounted(async () => {
  try {
    groups.value = await adminAPI.userGroups.list()
  } catch {
    groups.value = []
  }
})
</script>
