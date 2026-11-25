<template>
  <BaseDialog
    :show="show"
    :title="t('admin.groups.identityImport.title')"
    width="wide"
    :z-index="60"
    @close="handleClose"
  >
    <div class="space-y-4" data-testid="identity-import-dialog">
      <p class="text-xs leading-5 text-gray-500 dark:text-gray-400">
        {{ t('admin.groups.identityImport.hint') }}
      </p>

      <!-- 目标用户组 -->
      <div class="space-y-1.5">
        <label class="input-label">{{ t('admin.groups.identityImport.targetGroup') }}</label>
        <select
          v-model.number="targetGroupId"
          class="input"
          :disabled="importing || groupsLoading"
          data-testid="identity-import-group"
        >
          <option :value="0" disabled>{{ t('admin.groups.identityImport.targetGroupPlaceholder') }}</option>
          <option v-for="group in activeGroups" :key="group.id" :value="group.id">
            {{ group.name }} ({{ group.code }} · #{{ group.id }})
          </option>
        </select>
        <p v-if="groupsFailed" role="alert" class="text-xs text-red-600 dark:text-red-400">
          {{ t('admin.userGroups.failedToLoad') }}
        </p>
      </div>

      <!-- 目录搜索 -->
      <div class="space-y-2">
        <label class="input-label">{{ t('admin.groups.identityImport.searchLabel') }}</label>
        <div class="flex items-center gap-2">
          <input
            v-model="search"
            type="search"
            class="input flex-1"
            :placeholder="t('admin.groups.identityImport.searchPlaceholder')"
            :disabled="importing"
            data-testid="identity-import-search"
            @input="scheduleSearch"
            @keydown.enter.prevent="runSearch"
          />
          <button type="button" class="btn btn-secondary shrink-0" :disabled="importing || searching" @click="runSearch">
            {{ t('common.search') }}
          </button>
        </div>
        <p v-if="searchFailed" role="alert" class="text-xs text-red-600 dark:text-red-400">
          {{ t('admin.groups.identityImport.searchFailed') }}
        </p>
      </div>

      <!-- 穿梭框：左=目录候选，右=已选 -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <!-- 左面板 -->
        <div class="flex min-w-0 flex-col rounded-lg border border-gray-200 dark:border-dark-600">
          <div class="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-dark-600">
            <label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                :checked="allLeftChecked"
                :indeterminate="someLeftChecked"
                :disabled="importing || selectableLeft.length === 0"
                data-testid="identity-import-select-all"
                @change="toggleSelectAll"
              />
              {{ t('admin.groups.identityImport.selectAll') }}
            </label>
            <span class="ml-auto text-xs text-gray-500 dark:text-gray-400" role="status">
              {{ t('admin.groups.identityImport.leftTitle', { count: leftUsers.length }) }}
            </span>
          </div>
          <div class="h-64 space-y-1 overflow-y-auto p-2">
            <p v-if="searching" role="status" class="px-2 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
              {{ t('common.loading') }}
            </p>
            <p v-else-if="!searched" class="px-2 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.groups.identityImport.searchPrompt') }}
            </p>
            <p v-else-if="leftUsers.length === 0" class="px-2 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.groups.identityImport.noResults') }}
            </p>
            <label
              v-for="user in leftUsers"
              v-else
              :key="user.id"
              class="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700"
              :class="{ 'opacity-50': !selectable(user) }"
            >
              <input
                type="checkbox"
                class="mt-1"
                :checked="leftChecked.has(user.id)"
                :disabled="importing || !selectable(user)"
                data-testid="identity-import-candidate"
                @change="toggleLeftCheck(user)"
              />
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span class="break-words text-sm font-medium text-gray-900 dark:text-gray-100">{{ user.username }}</span>
                  <span v-if="!user.enabled" class="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-dark-600 dark:text-gray-300">
                    {{ t('common.disabled') }}
                  </span>
                  <span v-if="user.protected" class="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {{ t('admin.groups.identityImport.protectedBadge') }}
                  </span>
                </span>
                <span class="mt-0.5 block break-all text-xs text-gray-500 dark:text-gray-400">{{ user.email || t('admin.groups.identityImport.noEmail') }}</span>
              </span>
            </label>
          </div>
          <div v-if="searched && hasMore" class="border-t border-gray-200 p-2 text-center dark:border-dark-600">
            <button type="button" class="btn btn-secondary" :disabled="searching || importing" data-testid="identity-import-load-more" @click="loadMore">
              {{ t('admin.groups.identityImport.loadMore') }}
            </button>
          </div>
        </div>

        <!-- 中间操作列 -->
        <div class="flex flex-row items-center justify-center gap-2 sm:flex-col">
          <button
            type="button"
            class="btn btn-secondary px-2"
            :disabled="importing || leftChecked.size === 0"
            :title="t('admin.groups.identityImport.addChecked')"
            :aria-label="t('admin.groups.identityImport.addChecked')"
            data-testid="identity-import-add"
            @click="addChecked"
          >
            <Icon name="chevronRight" size="sm" />
          </button>
          <button
            type="button"
            class="btn btn-secondary px-2"
            :disabled="importing || rightChecked.size === 0"
            :title="t('admin.groups.identityImport.removeChecked')"
            :aria-label="t('admin.groups.identityImport.removeChecked')"
            data-testid="identity-import-remove"
            @click="removeChecked"
          >
            <Icon name="chevronLeft" size="sm" />
          </button>
        </div>

        <!-- 右面板：已选 -->
        <div class="flex min-w-0 flex-col rounded-lg border border-gray-200 dark:border-dark-600">
          <div class="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-dark-600">
            <label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                :checked="allRightChecked"
                :indeterminate="someRightChecked"
                :disabled="importing || selected.size === 0"
                data-testid="identity-import-right-select-all"
                @change="toggleRightSelectAll"
              />
              {{ t('admin.groups.identityImport.selectAll') }}
            </label>
            <span class="ml-auto text-xs text-gray-500 dark:text-gray-400" role="status" data-testid="identity-import-selected-count">
              {{ t('admin.groups.identityImport.rightTitle', { count: selected.size, max: maxBatch }) }}
            </span>
          </div>
          <div class="h-64 space-y-1 overflow-y-auto p-2">
            <p v-if="selected.size === 0" class="px-2 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.groups.identityImport.rightEmpty') }}
            </p>
            <label
              v-for="user in selectedUsers"
              v-else
              :key="user.id"
              class="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700"
            >
              <input
                type="checkbox"
                class="mt-1"
                :checked="rightChecked.has(user.id)"
                :disabled="importing"
                data-testid="identity-import-selected-item"
                @change="toggleRightCheck(user)"
              />
              <span class="min-w-0 flex-1">
                <span class="block break-words text-sm font-medium text-gray-900 dark:text-gray-100">{{ user.username }}</span>
                <span class="mt-0.5 block break-all text-xs text-gray-500 dark:text-gray-400">{{ user.email }}</span>
              </span>
            </label>
          </div>
          <div class="border-t border-gray-200 p-2 text-center dark:border-dark-600">
            <button
              type="button"
              class="rounded px-2 py-1 text-xs font-medium text-red-600 underline-offset-4 hover:underline disabled:opacity-50 dark:text-red-400"
              :disabled="importing || selected.size === 0"
              data-testid="identity-import-clear"
              @click="clearSelected"
            >
              {{ t('admin.groups.identityImport.clearSelected') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 导入结果 -->
      <div v-if="results.length > 0" class="space-y-1 rounded-lg border border-gray-200 p-3 text-xs dark:border-dark-600" role="status" data-testid="identity-import-results">
        <p class="font-medium text-gray-700 dark:text-gray-300">{{ t('admin.groups.identityImport.resultsTitle') }}</p>
        <p v-for="item in results" :key="item.subject" class="flex flex-wrap items-center gap-x-2">
          <span
            :class="{
              'text-green-600 dark:text-green-400': item.status === 'created',
              'text-gray-500 dark:text-gray-400': item.status === 'exists',
              'text-red-600 dark:text-red-400': item.status === 'failed'
            }"
          >
            {{ t(`admin.groups.identityImport.status.${item.status}`) }}
          </span>
          <span class="break-all text-gray-700 dark:text-gray-300">{{ item.username || item.email || item.subject }}</span>
          <span v-if="item.reason" class="break-all text-gray-500 dark:text-gray-400">{{ importReasonText(item.reason) }}</span>
        </p>
      </div>

      <!-- 操作区 -->
      <div class="flex items-center justify-end gap-2 border-t border-gray-200 pt-3 dark:border-dark-600">
        <span class="mr-auto text-xs text-gray-500 dark:text-gray-400" role="status">
          {{ t('admin.groups.identityImport.selectedCount', { count: selected.size }) }}
        </span>
        <button type="button" class="btn btn-secondary" :disabled="importing" @click="handleClose">
          {{ t('common.close') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="importing || selected.size === 0 || targetGroupId <= 0"
          data-testid="identity-import-submit"
          @click="submit"
        >
          <Icon v-if="importing" name="refresh" size="sm" class="mr-1 inline animate-spin" />
          {{ t('admin.groups.identityImport.importButton') }}
        </button>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import { identityAPI, type IdentityImportItem, type IdentityUser } from '@/api/identity'
import type { UserGroup } from '@/types'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Icon from '@/components/icons/Icon.vue'

const props = withDefaults(defineProps<{
  show: boolean
  /** 打开时默认选中的用户组（如选择器当前值）。 */
  defaultGroupId?: number | null
}>(), { defaultGroupId: null })

const emit = defineEmits<{
  close: []
  /** 至少一个账号导入成功（created）后发出，供调用方刷新成员/计数。 */
  imported: [items: IdentityImportItem[]]
}>()

const { t } = useI18n()
const appStore = useAppStore()

const maxBatch = 20

const groups = ref<UserGroup[]>([])
const groupsLoading = ref(false)
const groupsFailed = ref(false)
const targetGroupId = ref(0)

const search = ref('')
const searching = ref(false)
const searched = ref(false)
const searchFailed = ref(false)
const candidates = ref<IdentityUser[]>([])
const first = ref(0)
const hasMore = ref(false)

/** 穿梭框右侧：待导入账号（保序 Map）。 */
const selected = ref<Map<string, IdentityUser>>(new Map())
/** 左/右面板的勾选态（用于批量移入/移出）。 */
const leftChecked = ref<Set<string>>(new Set())
const rightChecked = ref<Set<string>>(new Set())

const importing = ref(false)
const results = ref<IdentityImportItem[]>([])

let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchVersion = 0

const activeGroups = computed(() => groups.value.filter(group => group.status === 'active'))
const selectedUsers = computed(() => [...selected.value.values()])
const leftUsers = computed(() => candidates.value.filter(user => !selected.value.has(user.id)))
const selectableLeft = computed(() => leftUsers.value.filter(selectable))
const allLeftChecked = computed(() =>
  selectableLeft.value.length > 0 && selectableLeft.value.every(user => leftChecked.value.has(user.id)))
const someLeftChecked = computed(() =>
  !allLeftChecked.value && selectableLeft.value.some(user => leftChecked.value.has(user.id)))
const allRightChecked = computed(() =>
  selected.value.size > 0 && selectedUsers.value.every(user => rightChecked.value.has(user.id)))
const someRightChecked = computed(() =>
  !allRightChecked.value && selectedUsers.value.some(user => rightChecked.value.has(user.id)))

function selectable(user: IdentityUser): boolean {
  return user.enabled && !user.protected && !!user.email
}

async function loadGroups() {
  groupsLoading.value = true
  groupsFailed.value = false
  try {
    groups.value = (await adminAPI.userGroups.list()) ?? []
    if (props.defaultGroupId && activeGroups.value.some(group => group.id === props.defaultGroupId)) {
      targetGroupId.value = props.defaultGroupId
    } else {
      const ordinary = activeGroups.value.find(group => group.code === 'default_user')
      targetGroupId.value = ordinary?.id ?? activeGroups.value[0]?.id ?? 0
    }
  } catch {
    groupsFailed.value = true
  } finally {
    groupsLoading.value = false
  }
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(runSearch, 350)
}

async function runSearch() {
  if (searchTimer) { clearTimeout(searchTimer); searchTimer = null }
  const version = ++searchVersion
  searching.value = true
  searchFailed.value = false
  try {
    const page = await identityAPI.users(search.value.trim(), 0)
    if (version !== searchVersion) return
    candidates.value = page.users ?? []
    first.value = candidates.value.length
    hasMore.value = page.hasMore
    searched.value = true
    leftChecked.value = new Set()
  } catch {
    if (version !== searchVersion) return
    searchFailed.value = true
    searched.value = true
    candidates.value = []
    hasMore.value = false
  } finally {
    if (version === searchVersion) searching.value = false
  }
}

async function loadMore() {
  const version = ++searchVersion
  searching.value = true
  try {
    const page = await identityAPI.users(search.value.trim(), first.value)
    if (version !== searchVersion) return
    candidates.value = [...candidates.value, ...(page.users ?? [])]
    first.value = candidates.value.length
    hasMore.value = page.hasMore
  } catch {
    if (version === searchVersion) searchFailed.value = true
  } finally {
    if (version === searchVersion) searching.value = false
  }
}

function toggleLeftCheck(user: IdentityUser) {
  if (!selectable(user)) return
  const next = new Set(leftChecked.value)
  if (next.has(user.id)) next.delete(user.id)
  else next.add(user.id)
  leftChecked.value = next
}

function toggleSelectAll() {
  if (allLeftChecked.value) {
    leftChecked.value = new Set()
  } else {
    leftChecked.value = new Set(selectableLeft.value.map(user => user.id))
  }
}

function toggleRightCheck(user: IdentityUser) {
  const next = new Set(rightChecked.value)
  if (next.has(user.id)) next.delete(user.id)
  else next.add(user.id)
  rightChecked.value = next
}

function toggleRightSelectAll() {
  if (allRightChecked.value) {
    rightChecked.value = new Set()
  } else {
    rightChecked.value = new Set(selected.value.keys())
  }
}

/** 把左侧勾选的账号移入右侧；受单批上限约束，超出部分保持勾选并提示。 */
function addChecked() {
  const room = maxBatch - selected.value.size
  if (room <= 0) {
    appStore.showError(t('admin.groups.identityImport.maxBatch'))
    return
  }
  const next = new Map(selected.value)
  const remaining = new Set(leftChecked.value)
  let added = 0
  for (const user of leftUsers.value) {
    if (!leftChecked.value.has(user.id) || !selectable(user)) continue
    if (added >= room) break
    next.set(user.id, user)
    remaining.delete(user.id)
    added++
  }
  selected.value = next
  leftChecked.value = remaining
  if (remaining.size > 0) {
    appStore.showError(t('admin.groups.identityImport.maxBatch'))
  }
}

function removeChecked() {
  const next = new Map(selected.value)
  for (const id of rightChecked.value) next.delete(id)
  selected.value = next
  rightChecked.value = new Set()
}

function clearSelected() {
  selected.value = new Map()
  rightChecked.value = new Set()
}

function importReasonText(reason: string): string {
  const key = `admin.groups.identityImport.reasons.${reason}`
  const translated = t(key)
  return translated === key ? reason : translated
}

async function submit() {
  if (importing.value || selected.value.size === 0 || targetGroupId.value <= 0) return
  importing.value = true
  results.value = []
  try {
    const { results: items } = await identityAPI.importAccounts({
      subjects: [...selected.value.keys()],
      userGroupId: targetGroupId.value,
      reason: t('admin.groups.identityImport.reason')
    })
    results.value = items ?? []
    const created = results.value.filter(item => item.status === 'created')
    const failed = results.value.filter(item => item.status === 'failed')
    if (created.length > 0) {
      appStore.showSuccess(t('admin.groups.identityImport.success', { count: created.length }))
      emit('imported', results.value)
    }
    if (failed.length > 0) {
      appStore.showError(t('admin.groups.identityImport.partialFailure', { count: failed.length }))
    }
    if (created.length === 0 && failed.length === 0 && results.value.length > 0) {
      appStore.showSuccess(t('admin.groups.identityImport.allExist'))
    }
    selected.value = new Map()
    rightChecked.value = new Set()
    leftChecked.value = new Set()
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, t('admin.groups.identityImport.failed')))
  } finally {
    importing.value = false
  }
}

function handleClose() {
  if (importing.value) return
  emit('close')
}

function resetAndLoad() {
  search.value = ''
  searched.value = false
  searchFailed.value = false
  candidates.value = []
  selected.value = new Map()
  leftChecked.value = new Set()
  rightChecked.value = new Set()
  results.value = []
  hasMore.value = false
  first.value = 0
  void loadGroups()
}

watch(() => props.show, (show) => {
  if (show) resetAndLoad()
})

onMounted(() => {
  if (props.show) resetAndLoad()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  searchVersion++
})
</script>
