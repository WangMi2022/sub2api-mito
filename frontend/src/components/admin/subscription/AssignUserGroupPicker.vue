<template>
  <div class="space-y-1.5" data-testid="assign-user-group-picker">
    <Select
      :model-value="null"
      :options="options"
      :disabled="disabled"
      :loading="loading"
      :error="failed"
      :placeholder="t('admin.subscriptions.assignTarget.selectPlaceholder')"
      :search-placeholder="t('admin.subscriptions.assignTarget.searchPlaceholder')"
      :empty-text="failed ? t('admin.subscriptions.assignTarget.loadFailed') : t('common.noOptionsFound')"
      :aria-label="t('admin.subscriptions.assignTarget.groupLabel')"
      searchable
      @change="addGroup"
    >
      <template #option="{ option }">
        <div class="flex min-w-0 flex-1 items-center gap-3 py-1">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="break-words font-medium text-gray-900 dark:text-gray-100">{{ option.label }}</span>
              <span
                v-if="option.isSystem"
                class="rounded-md bg-primary-50 px-1.5 py-0.5 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
              >
                {{ t('admin.userGroups.systemBadge') }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
              <span class="break-all">{{ option.code }}</span>
              <span class="tabular-nums">
                {{ t('admin.subscriptions.assignTarget.members', { count: option.memberCount }) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </Select>

    <div v-if="failed" role="alert" class="flex flex-wrap items-center justify-between gap-2 text-xs text-red-600 dark:text-red-400">
      <span>{{ t('admin.subscriptions.assignTarget.loadFailed') }}</span>
      <button type="button" class="rounded px-2 py-1 font-medium underline underline-offset-4" :disabled="disabled" @click="loadGroups">
        {{ t('admin.subscriptions.assignTarget.retry') }}
      </button>
    </div>

    <div v-if="modelValue.length > 0" class="space-y-1.5 pt-0.5" data-testid="assign-user-group-selected">
      <ul class="space-y-1">
        <li
          v-for="group in modelValue"
          :key="group.id"
          class="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-sm dark:bg-dark-700"
        >
          <span class="min-w-0 truncate">
            <Icon name="users" size="sm" class="mr-1.5 inline-block align-[-0.15em] text-primary-500" />
            <span class="font-medium text-gray-900 dark:text-white">{{ group.name }}</span>
            <span class="ml-2 text-gray-500 dark:text-gray-400 tabular-nums">
              {{ t('admin.subscriptions.assignTarget.members', { count: group.memberIds.length }) }}
            </span>
          </span>
          <button
            type="button"
            :disabled="disabled"
            :aria-label="t('admin.subscriptions.assignTarget.remove', { name: group.name })"
            class="shrink-0 text-gray-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
            @click="removeGroup(group.id)"
          >
            <Icon name="x" size="sm" />
          </button>
        </li>
      </ul>
      <p v-if="emptyGroups.length > 0" class="text-xs text-amber-600 dark:text-amber-400" role="status">
        {{ t('admin.subscriptions.assignTarget.emptyGroups', { names: emptyGroups.map((group) => group.name).join('、') }) }}
      </p>
    </div>

    <p v-if="!failed" class="text-xs leading-5 text-gray-500 dark:text-gray-400" role="status">
      {{ loading ? t('common.loading') : t('admin.subscriptions.assignTarget.hint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from '@/components/common/Select.vue'
import Icon from '@/components/icons/Icon.vue'
import { userGroupsAPI } from '@/api/admin'
import type { UserGroup } from '@/types'

/** 已被选中的用户组：连同成员 id 一起缓存，提交时直接展开。 */
export interface SelectedAssignUserGroup {
  id: number
  name: string
  memberIds: number[]
}

const props = withDefaults(
  defineProps<{
    modelValue: SelectedAssignUserGroup[]
    disabled?: boolean
  }>(),
  { disabled: false }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: SelectedAssignUserGroup[]): void
}>()

const { t } = useI18n()

const groups = ref<UserGroup[]>([])
const loading = ref(false)
const failed = ref(false)

const selectedIds = computed(() => new Set(props.modelValue.map((group) => group.id)))

const options = computed(() =>
  groups.value.map((group) => ({
    value: group.id,
    label: group.name,
    code: group.code,
    memberCount: group.member_count ?? 0,
    isSystem: group.is_system,
    // 已选中的组禁止重复添加。
    disabled: selectedIds.value.has(group.id)
  }))
)

const emptyGroups = computed(() => props.modelValue.filter((group) => group.memberIds.length === 0))

async function loadGroups(): Promise<void> {
  loading.value = true
  failed.value = false
  try {
    groups.value = await userGroupsAPI.list()
  } catch (error) {
    console.error('[AssignUserGroupPicker] Failed to load user groups', error)
    groups.value = []
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function addGroup(option: { value: unknown } | null): Promise<void> {
  if (props.disabled || !option) return
  const id = Number(option.value)
  if (!Number.isFinite(id) || selectedIds.value.has(id)) return

  const group = groups.value.find((item) => item.id === id)
  let memberIds: number[] = []
  try {
    memberIds = await userGroupsAPI.listMembers(id)
  } catch (error) {
    console.error('[AssignUserGroupPicker] Failed to load members', error)
    failed.value = true
    return
  }

  emit('update:modelValue', [
    ...props.modelValue,
    { id, name: group?.name ?? `#${id}`, memberIds }
  ])
}

function removeGroup(id: number): void {
  if (props.disabled) return
  emit('update:modelValue', props.modelValue.filter((group) => group.id !== id))
}

defineExpose({ reload: loadGroups })

onMounted(loadGroups)
</script>
