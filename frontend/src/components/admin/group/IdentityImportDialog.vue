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

      <!-- 结果列表 -->
      <div class="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-dark-600">
        <p v-if="searching" role="status" class="px-2 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
          {{ t('common.loading') }}
        </p>
        <p v-else-if="!searched" class="px-2 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
          {{ t('admin.groups.identityImport.searchPrompt') }}
        </p>
        <p v-else-if="candidates.length === 0" class="px-2 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
          {{ t('admin.groups.identityImport.noResults') }}
        </p>
        <label
          v-for="user in candidates"
          v-else
          :key="user.id"
          class="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-dark-700"
          :class="{ 'opacity-50': !selectable(user) }"
        >
          <input
            type="checkbox"
            class="mt-1"
            :checked="selected.has(user.id)"
            :disabled="importing || !selectable(user)"
            data-testid="identity-import-candidate"
            @change="toggle(user)"
          />
          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
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
      <div v-if="searched && hasMore" class="text-center">
        <button type="button" class="btn btn-secondary" :disabled="searching || importing" @click="loadMore">
          {{ t('admin.groups.identityImport.loadMore') }}
        </button>
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
const selected = ref<Map<string, IdentityUser>>(new Map())

const importing = ref(false)
const results = ref<IdentityImportItem[]>([])

let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchVersion = 0

const activeGroups = computed(() => groups.value.filter(group => group.status === 'active'))

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

function toggle(user: IdentityUser) {
  if (!selectable(user)) return
  const next = new Map(selected.value)
  if (next.has(user.id)) next.delete(user.id)
  else if (next.size < 20) next.set(user.id, user)
  else { appStore.showError(t('admin.groups.identityImport.maxBatch')); return }
  selected.value = next
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
