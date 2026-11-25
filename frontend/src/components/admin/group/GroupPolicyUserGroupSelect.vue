<template>
  <div class="space-y-1.5" data-testid="policy-user-group-select">
    <Select
      :model-value="modelValue?.id ?? null"
      :options="options"
      :disabled="disabled"
      :loading="loading"
      :error="failed"
      :placeholder="t('admin.userGroups.fieldPlaceholder')"
      :search-placeholder="t('admin.groups.searchUserGroupPlaceholder')"
      :empty-text="failed ? t('admin.userGroups.failedToLoad') : t('common.noOptionsFound')"
      :aria-label="t('admin.userGroups.fieldLabel')"
      searchable
      clearable
      @change="selectGroup"
    >
      <template #selected="{ option }">
        <span class="flex min-w-0 items-center gap-2">
          <Icon name="users" size="sm" class="shrink-0 text-primary-500" />
          <span class="truncate" :class="option ? 'font-medium' : 'text-gray-500 dark:text-gray-400'">
            {{ option?.label ?? t('admin.userGroups.fieldPlaceholder') }}
          </span>
        </span>
      </template>
      <template #option="{ option, selected }">
        <div class="flex min-w-0 flex-1 items-center gap-3 py-1">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="break-words font-medium text-gray-900 dark:text-gray-100">{{ option.label }}</span>
              <span v-if="option.isSystem" class="rounded-md bg-primary-50 px-1.5 py-0.5 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {{ t('admin.userGroups.systemBadge') }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
              <span class="break-all">{{ option.code }} · #{{ option.value }}</span>
              <span class="tabular-nums">{{ t('admin.userGroups.memberCount') }} {{ option.memberCount }}</span>
            </div>
          </div>
          <span v-if="option.configured" class="shrink-0 text-xs text-gray-500 dark:text-gray-400">
            {{ t('admin.groups.userGroupAlreadyConfigured') }}
          </span>
          <span v-else-if="option.disabled" class="shrink-0 text-xs text-gray-500 dark:text-gray-400">
            {{ t('common.disabled') }}
          </span>
          <Icon v-else-if="selected" name="check" size="sm" class="shrink-0 text-primary-500" />
        </div>
      </template>
    </Select>
    <div v-if="identityManage" class="flex items-center justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-primary-600 underline-offset-4 hover:underline disabled:opacity-50 dark:text-primary-400"
        :disabled="disabled"
        data-testid="identity-import-open"
        @click="importOpen = true"
      >
        <Icon name="users" size="sm" class="shrink-0" />
        {{ t('admin.groups.identityImport.openLabel') }}
      </button>
    </div>
    <IdentityImportDialog
      v-if="identityManage"
      :show="importOpen"
      :default-group-id="modelValue?.id ?? null"
      @close="importOpen = false"
      @imported="handleImported"
    />
    <div v-if="failed" role="alert" class="flex flex-wrap items-center justify-between gap-2 text-xs text-red-600 dark:text-red-400">
      <span>{{ t('admin.userGroups.failedToLoad') }}</span>
      <button type="button" class="rounded px-2 py-1 font-medium underline underline-offset-4" :disabled="disabled" @click="loadGroups">
        {{ t('admin.groups.retryUserGroups') }}
      </button>
    </div>
    <p v-else class="text-xs leading-5 text-gray-500 dark:text-gray-400" role="status">
      {{ loading ? t('common.loading') : t('admin.groups.userGroupSelectHint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import type { UserGroup } from '@/types'
import Select from '@/components/common/Select.vue'
import Icon from '@/components/icons/Icon.vue'

const props = withDefaults(defineProps<{
  modelValue: UserGroup | null
  configuredIds: number[]
  disabled?: boolean
}>(), { disabled: false })

const emit = defineEmits<{ 'update:modelValue': [group: UserGroup | null] }>()

// 异步加载导入对话框：只有具备统一身份管理能力的管理员才会真正加载它，
// 其余场景不引入 app store / i18n 实例等依赖。
const IdentityImportDialog = defineAsyncComponent(() => import('./IdentityImportDialog.vue'))
const { t } = useI18n()
const groups = ref<UserGroup[]>([])
const loading = ref(false)
const failed = ref(false)
let loadVersion = 0
const identityManage = ref(false)
const importOpen = ref(false)

// 统一身份目录可用且当前管理员在允许名单内时，才展示「从统一身份导入」入口。
async function loadIdentityCapability() {
  try {
    // 动态引入：避免把 API client 的 i18n 实例依赖带进本组件的静态依赖图。
    const { identityAPI } = await import('@/api/identity')
    identityManage.value = (await identityAPI.capabilities()).manage === true
  } catch {
    identityManage.value = false
  }
}

async function handleImported() {
  await loadGroups()
}

const configuredIds = computed(() => new Set(props.configuredIds))
const options = computed(() => groups.value.map(group => ({
  value: group.id,
  label: group.name,
  description: `${group.code} #${group.id}`,
  code: group.code,
  isSystem: group.is_system,
  memberCount: group.member_count ?? 0,
  configured: configuredIds.value.has(group.id),
  disabled: configuredIds.value.has(group.id) || group.status === 'disabled'
})))

async function loadGroups() {
  const version = ++loadVersion
  loading.value = true
  failed.value = false
  try {
    const result = await adminAPI.userGroups.list()
    if (version === loadVersion) groups.value = result ?? []
  } catch {
    if (version === loadVersion) failed.value = true
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

function selectGroup(value: unknown) {
  if (props.disabled || loading.value || failed.value) return
  if (value == null) {
    emit('update:modelValue', null)
    return
  }
  const group = groups.value.find(group => group.id === value)
  if (!group || group.status === 'disabled' || configuredIds.value.has(group.id)) return
  emit('update:modelValue', group)
}

onMounted(() => { void loadGroups(); void loadIdentityCapability() })
onBeforeUnmount(() => { loadVersion++ })
</script>
