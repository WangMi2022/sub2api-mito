<template>
  <BaseDialog :show="show" :title="t('admin.groups.rateMultipliersTitle')" width="wide" @close="handleClose">
    <div v-if="group" class="space-y-4">
      <!-- 分组信息 -->
      <div class="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5 text-sm dark:bg-dark-700">
        <span class="inline-flex items-center gap-1.5" :class="platformColorClass">
          <PlatformIcon :platform="group.platform" size="sm" />
          {{ t('admin.groups.platforms.' + group.platform, platformLabel(group.platform)) }}
        </span>
        <span class="text-gray-400">|</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ group.name }}</span>
        <span class="text-gray-400">|</span>
        <span class="text-gray-600 dark:text-gray-400">
          {{ t('admin.groups.columns.rateMultiplier') }}: {{ group.rate_multiplier }}x
        </span>
      </div>

      <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('admin.groups.userGroupPolicyHint') }}</p>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center py-6">
        <svg class="h-6 w-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <div v-else>
        <div class="mb-2 flex flex-wrap items-center gap-3">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ t('admin.groups.rateMultipliers') }} ({{ localEntries.length }})
          </h4>
          <div v-if="localEntries.length > 0" class="flex items-center gap-1.5">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('admin.groups.batchAdjust') }}</span>
            <span class="text-xs text-gray-400">×</span>
            <input
              v-model.number="batchFactor"
              type="number"
              step="0.1"
              min="0"
              autocomplete="off"
              class="hide-spinner w-20 rounded border border-gray-200 bg-white px-2 py-1 text-center text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20 dark:border-dark-500 dark:bg-dark-700 dark:focus:border-primary-500"
              placeholder="0.5"
            />
            <button
              type="button"
              class="btn btn-primary btn-sm shrink-0 px-2.5 py-1 text-xs"
              :disabled="!batchFactor || batchFactor <= 0"
              @click="applyBatchFactor"
            >
              {{ t('admin.groups.applyMultiplier') }}
            </button>
          </div>
          <div class="ml-auto">
            <button
              type="button"
              class="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
              @click="clearAllLocal"
            >
              {{ t('admin.groups.clearAll') }}
            </button>
          </div>
        </div>

        <div v-if="localEntries.length === 0" class="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
          {{ t('admin.groups.noUserGroupRateMultipliers') }}
        </div>

        <div v-else>
          <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600">
            <div class="max-h-[420px] overflow-auto">
              <table class="w-full min-w-max text-sm">
                <thead class="sticky top-0 z-[1]">
                  <tr class="border-b border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700">
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('admin.groups.columns.userGroup') }}</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">ID</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('admin.groups.columns.memberCount') }}</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('admin.groups.columns.rateMultiplier') }}</th>
                    <th v-if="showFinalRate" class="px-3 py-2 text-left text-xs font-medium text-primary-600 dark:text-primary-400">{{ t('admin.groups.finalRate') }}</th>
                    <th class="w-10 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-dark-600">
                  <tr
                    v-for="entry in paginatedLocalEntries"
                    :key="entry.user_group_id"
                    class="hover:bg-gray-50 dark:hover:bg-dark-700/50"
                  >
                    <td class="px-3 py-2 text-gray-900 dark:text-white">
                      <span>{{ entry.user_group_name }}</span>
                      <span v-if="entry.is_system" class="ml-1.5 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-dark-600 dark:text-gray-400">
                        {{ t('admin.userGroups.systemBadge') }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-gray-400 dark:text-gray-500">{{ entry.user_group_id }}</td>
                    <td class="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400">{{ entry.member_count }}</td>
                    <td class="whitespace-nowrap px-3 py-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        autocomplete="off"
                        :value="entry.rate_multiplier ?? ''"
                        :placeholder="String(props.group?.rate_multiplier ?? 1)"
                        class="hide-spinner w-20 rounded border border-gray-200 bg-white px-2 py-1 text-center text-sm font-medium transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20 dark:border-dark-500 dark:bg-dark-700 dark:focus:border-primary-500"
                        @change="updateLocalRate(entry.user_group_id, ($event.target as HTMLInputElement).value)"
                      />
                    </td>
                    <td v-if="showFinalRate" class="whitespace-nowrap px-3 py-2 font-medium text-primary-600 dark:text-primary-400">
                      {{ computeFinalRate(entry.rate_multiplier) }}
                    </td>
                    <td class="px-2 py-2">
                      <button
                        type="button"
                        class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        @click="removeLocal(entry.user_group_id)"
                      >
                        <Icon name="trash" size="sm" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            :total="localEntries.length"
            :page="currentPage"
            :page-size="pageSize"
            @update:page="currentPage = $event"
            @update:pageSize="handlePageSizeChange"
          />
        </div>
      </div>

      <!-- 快速配置：把某个未配置的用户组加入表格 -->
      <div class="rounded-lg border border-gray-200 p-3 dark:border-dark-600">
        <h4 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('admin.groups.addUserGroupRate') }}
        </h4>
        <div class="flex items-end gap-2">
          <div class="relative flex-1">
            <input
              v-model="searchQuery"
              type="text"
              autocomplete="off"
              class="input w-full"
              :placeholder="t('admin.groups.searchUserGroupPlaceholder')"
              @input="handleSearchGroups"
              @focus="showDropdown = true"
            />
            <div
              v-if="showDropdown && searchResults.length > 0"
              class="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-500 dark:bg-dark-700"
            >
              <button
                v-for="ug in searchResults"
                :key="ug.id"
                type="button"
                class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-dark-600"
                @click="selectUserGroup(ug)"
              >
                <span class="text-gray-400">#{{ ug.id }}</span>
                <span class="text-gray-900 dark:text-white">{{ ug.name }}</span>
                <span class="text-xs text-gray-400">{{ t('admin.groups.columns.memberCount') }} {{ ug.member_count }}</span>
              </button>
            </div>
          </div>
          <div class="w-24">
            <input
              v-model.number="newRate"
              type="number"
              step="0.001"
              min="0"
              autocomplete="off"
              class="hide-spinner input w-full"
              placeholder="1.0"
            />
          </div>
          <button
            type="button"
            class="btn btn-primary shrink-0"
            :disabled="!selectedUserGroup || newRate == null || newRate <= 0"
            @click="handleAddLocal"
          >
            {{ t('common.add') }}
          </button>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-dark-600">
        <template v-if="isDirty">
          <span class="text-xs text-amber-600 dark:text-amber-400">{{ t('admin.groups.unsavedChanges') }}</span>
          <button
            type="button"
            class="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            @click="handleCancel"
          >
            {{ t('admin.groups.revertChanges') }}
          </button>
        </template>
        <div class="ml-auto flex items-center gap-3">
          <button type="button" class="btn btn-sm px-4 py-1.5" @click="handleClose">
            {{ t('common.close') }}
          </button>
          <button
            v-if="isDirty"
            type="button"
            class="btn btn-primary btn-sm px-4 py-1.5"
            :disabled="saving"
            @click="handleSave"
          >
            <Icon v-if="saving" name="refresh" size="sm" class="mr-1 animate-spin" />
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { adminAPI } from '@/api/admin'
import type { GroupUserGroupPolicyRow } from '@/api/admin/groups'
import type { AdminGroup, UserGroup } from '@/types'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Pagination from '@/components/common/Pagination.vue'
import Icon from '@/components/icons/Icon.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import { platformLabel } from '@/utils/platformColors'

interface LocalEntry extends GroupUserGroupPolicyRow {}

const props = defineProps<{
  show: boolean
  group: AdminGroup | null
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { t } = useI18n()
const appStore = useAppStore()

const loading = ref(false)
const saving = ref(false)
const serverEntries = ref<GroupUserGroupPolicyRow[]>([])
const localEntries = ref<LocalEntry[]>([])
const searchQuery = ref('')
const searchResults = ref<UserGroup[]>([])
const showDropdown = ref(false)
const selectedUserGroup = ref<UserGroup | null>(null)
const newRate = ref<number | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)
const batchFactor = ref<number | null>(null)

let searchTimeout: ReturnType<typeof setTimeout>
let loadVersion = 0

const platformColorClass = computed(() => {
  switch (props.group?.platform) {
    case 'anthropic': return 'text-orange-700 dark:text-orange-400'
    case 'openai': return 'text-emerald-700 dark:text-emerald-400'
    case 'antigravity': return 'text-purple-700 dark:text-purple-400'
    default: return 'text-blue-700 dark:text-blue-400'
  }
})

const showFinalRate = computed(() => {
  return batchFactor.value != null && batchFactor.value > 0 && batchFactor.value !== 1
})

const computeFinalRate = (rate: number | null | undefined) => {
  const base = rate ?? props.group?.rate_multiplier ?? 1
  if (!batchFactor.value) return base
  return parseFloat((base * batchFactor.value).toFixed(6))
}

const isDirty = computed(() => {
  if (localEntries.value.length !== serverEntries.value.length) return true
  const serverMap = new Map(serverEntries.value.map(e => [e.user_group_id, e.rate_multiplier ?? null]))
  return localEntries.value.some(e => serverMap.get(e.user_group_id) !== (e.rate_multiplier ?? null))
})

const paginatedLocalEntries = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return localEntries.value.slice(start, start + pageSize.value)
})

const cloneEntries = (entries: GroupUserGroupPolicyRow[]): LocalEntry[] => {
  return entries.map(e => ({ ...e, denied_models: e.denied_models ? [...e.denied_models] : null }))
}

const loadEntries = async () => {
  if (!props.group) return
  const version = ++loadVersion
  loading.value = true
  serverEntries.value = []
  localEntries.value = []
  try {
    const raw = await adminAPI.groups.getGroupUserGroupPolicies(props.group.id)
    if (version !== loadVersion) return
    // 仅显示已设置 rate_multiplier 的条目；rpm/denied_models 由独立弹窗管理。
    serverEntries.value = raw.filter(e => e.rate_multiplier != null)
    localEntries.value = cloneEntries(serverEntries.value)
    adjustPage()
  } catch (error) {
    if (version !== loadVersion) return
    appStore.showError(t('admin.groups.failedToLoad'))
    console.error('Error loading group rate multipliers:', error)
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

const adjustPage = () => {
  const totalPages = Math.max(1, Math.ceil(localEntries.value.length / pageSize.value))
  if (currentPage.value > totalPages) {
    currentPage.value = totalPages
  }
}

watch([() => props.show, () => props.group?.id], ([show]) => {
  loadVersion++
  if (show && props.group) {
    currentPage.value = 1
    batchFactor.value = null
    searchQuery.value = ''
    searchResults.value = []
    selectedUserGroup.value = null
    newRate.value = null
    loadEntries()
  }
})

const handlePageSizeChange = (newSize: number) => {
  pageSize.value = newSize
  currentPage.value = 1
}

const handleSearchGroups = () => {
  clearTimeout(searchTimeout)
  selectedUserGroup.value = null
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    showDropdown.value = false
    return
  }
  searchTimeout = setTimeout(async () => {
    try {
      const keyword = searchQuery.value.trim().toLowerCase()
      const all = await adminAPI.userGroups.list()
      searchResults.value = all
        .filter(ug => !localEntries.value.some(e => e.user_group_id === ug.id))
        .filter(ug => ug.name.toLowerCase().includes(keyword) || ug.code.toLowerCase().includes(keyword))
        .slice(0, 10)
      showDropdown.value = true
    } catch {
      searchResults.value = []
    }
  }, 200)
}

const selectUserGroup = (ug: UserGroup) => {
  selectedUserGroup.value = ug
  searchQuery.value = ug.name
  showDropdown.value = false
  searchResults.value = []
}

const handleAddLocal = () => {
  if (!selectedUserGroup.value || newRate.value == null || newRate.value <= 0) return
  const ug = selectedUserGroup.value
  const idx = localEntries.value.findIndex(e => e.user_group_id === ug.id)
  const entry: LocalEntry = {
    user_group_id: ug.id,
    user_group_name: ug.name,
    user_group_code: ug.code,
    is_system: ug.is_system,
    member_count: ug.member_count ?? 0,
    rate_multiplier: newRate.value,
    rpm_override: null,
    denied_models: null
  }
  if (idx >= 0) {
    localEntries.value[idx] = entry
  } else {
    localEntries.value.push(entry)
  }
  searchQuery.value = ''
  selectedUserGroup.value = null
  newRate.value = null
  adjustPage()
}

const updateLocalRate = (userGroupId: number, value: string) => {
  const entry = localEntries.value.find(e => e.user_group_id === userGroupId)
  if (!entry) return
  if (value.trim() === '') {
    entry.rate_multiplier = null
    return
  }
  const num = parseFloat(value)
  if (isNaN(num)) return
  entry.rate_multiplier = num
}

const removeLocal = (userGroupId: number) => {
  localEntries.value = localEntries.value.filter(e => e.user_group_id !== userGroupId)
  adjustPage()
}

const applyBatchFactor = () => {
  if (!batchFactor.value || batchFactor.value <= 0) return
  for (const entry of localEntries.value) {
    if (entry.rate_multiplier != null) {
      entry.rate_multiplier = parseFloat((entry.rate_multiplier * batchFactor.value).toFixed(6))
    }
  }
  batchFactor.value = null
}

const clearAllLocal = () => {
  localEntries.value = []
}

const handleCancel = () => {
  localEntries.value = cloneEntries(serverEntries.value)
  batchFactor.value = null
  adjustPage()
}

const handleSave = async () => {
  if (!props.group) return
  saving.value = true
  try {
    const entries = localEntries.value
      .filter(e => e.rate_multiplier != null)
      .map(e => ({
        user_group_id: e.user_group_id,
        rate_multiplier: e.rate_multiplier as number
      }))
    await adminAPI.groups.batchSetGroupUserGroupRates(props.group.id, entries)
    appStore.showSuccess(t('admin.groups.rateSaved'))
    emit('success')
    emit('close')
  } catch (error) {
    appStore.showError(t('admin.groups.failedToSave'))
    console.error('Error saving rate multipliers:', error)
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  if (isDirty.value) {
    localEntries.value = cloneEntries(serverEntries.value)
  }
  emit('close')
}

const handleClickOutside = () => {
  showDropdown.value = false
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', handleClickOutside)
}
onUnmounted(() => {
  loadVersion++
  clearTimeout(searchTimeout)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.hide-spinner::-webkit-outer-spin-button,
.hide-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.hide-spinner {
  -moz-appearance: textfield;
}
</style>
