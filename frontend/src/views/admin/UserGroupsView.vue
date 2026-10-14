<template>
  <AppLayout>
    <TablePageLayout>
      <!-- Filters -->
      <template #filters>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex-1 sm:max-w-64">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('admin.userGroups.searchPlaceholder')"
              class="input"
            />
          </div>
          <div class="flex flex-1 flex-wrap items-center justify-end gap-2">
            <button @click="load" :disabled="loading" class="btn btn-secondary" :title="t('common.refresh')">
              <Icon name="refresh" size="md" :class="loading ? 'animate-spin' : ''" />
            </button>
            <button @click="openCreate" class="btn btn-primary" data-testid="user-group-create">
              <Icon name="plus" size="md" class="mr-1" />
              {{ t('admin.userGroups.create') }}
            </button>
          </div>
        </div>
      </template>

      <template #table>
        <!-- 未分组提示 -->
        <div class="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300">
          <Icon name="exclamationTriangle" size="md" class="mt-0.5 flex-shrink-0" />
          <span>{{ t('admin.userGroups.ungroupedWarning') }}</span>
        </div>

        <DataTable :columns="columns" :data="filteredGroups" :loading="loading">
        <template #cell-name="{ row }">
          <div class="flex items-center gap-2">
            <Icon :name="row.is_system ? 'shield' : 'users'" size="sm" :class="row.is_system ? 'text-primary-500' : 'text-gray-400'" />
            <span class="font-medium text-gray-900 dark:text-white">{{ row.name }}</span>
            <span v-if="row.is_system" class="badge badge-gray">{{ t('admin.userGroups.systemBadge') }}</span>
          </div>
        </template>

        <template #cell-code="{ value }">
          <code class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-dark-700 dark:text-gray-300">{{ value }}</code>
        </template>

        <template #cell-description="{ value }">
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ value || '-' }}</span>
        </template>

        <template #cell-member_count="{ row }">
          <span class="badge badge-primary">{{ row.member_count }}</span>
        </template>

        <template #cell-status="{ value }">
          <span :class="['badge', value === 'active' ? 'badge-success' : 'badge-gray']">
            {{ value === 'active' ? t('common.active') : t('admin.users.disabled') }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center gap-1">
            <button
              @click="openMembers(row)"
              class="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              :title="t('admin.userGroups.manageMembers')"
              :data-testid="`user-group-members-${row.id}`"
            >
              <Icon name="users" size="sm" />
            </button>
            <button
              @click="openEdit(row)"
              class="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-600 dark:hover:text-gray-300"
              :title="t('common.edit')"
              :disabled="row.is_system"
            >
              <Icon name="edit" size="sm" />
            </button>
            <button
              @click="handleDelete(row)"
              class="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              :title="t('common.delete')"
              :disabled="row.is_system"
              :data-testid="`user-group-delete-${row.id}`"
            >
              <Icon name="trash" size="sm" />
            </button>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :title="t('admin.userGroups.noGroupsYet')"
            :description="t('admin.userGroups.createFirst')"
            :action-text="t('admin.userGroups.create')"
            @action="openCreate"
          />
        </template>
        </DataTable>
      </template>

      <template #pagination>
        <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>{{ t('admin.userGroups.totalGroups') }}: {{ groups.length }}</span>
          <span>{{ t('admin.userGroups.totalMembers') }}: {{ totalMembers }}</span>
        </div>
      </template>
    </TablePageLayout>

    <!-- Create / Edit Dialog -->
    <BaseDialog
      :show="showEditDialog"
      :title="isEditing ? t('admin.userGroups.edit') : t('admin.userGroups.create')"
      width="normal"
      @close="closeEdit"
    >
      <form id="user-group-form" @submit.prevent="handleSave" class="space-y-4">
        <div>
          <label class="input-label">{{ t('admin.userGroups.name') }}</label>
          <input
            v-model="form.name"
            type="text"
            class="input"
            required
            :disabled="editingIsSystem"
            :placeholder="t('admin.userGroups.namePlaceholder')"
            data-testid="user-group-name"
          />
        </div>
        <div v-if="isEditing">
          <label class="input-label">{{ t('admin.userGroups.code') }}</label>
          <input :value="editingGroup?.code" type="text" class="input" disabled />
        </div>
        <div>
          <label class="input-label">{{ t('admin.userGroups.descriptionLabel') }}</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="input"
            :placeholder="t('admin.userGroups.descriptionPlaceholder')"
          ></textarea>
        </div>
        <div v-if="editingIsSystem">
          <p class="input-hint">{{ t('admin.userGroups.systemHint') }}</p>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="closeEdit" type="button" class="btn btn-secondary">{{ t('common.cancel') }}</button>
          <button type="submit" form="user-group-form" :disabled="saving" class="btn btn-primary" data-testid="user-group-save">
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </template>
    </BaseDialog>

    <!-- Members Dialog -->
    <BaseDialog
      :show="showMembersDialog"
      :title="t('admin.userGroups.membersTitle', { name: membersGroup?.name ?? '' })"
      width="wide"
      @close="closeMembers"
    >
      <div class="space-y-3">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('admin.userGroups.membersHint') }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative min-w-[220px] flex-1">
            <Icon name="search" size="sm" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              v-model="memberSearch"
              type="text"
              class="input pl-9"
              :placeholder="t('admin.userGroups.searchUsers')"
            />
          </div>
          <button type="button" class="btn btn-secondary btn-sm" @click="selectAllVisible">
            {{ t('admin.userGroups.selectAll') }}
          </button>
          <button type="button" class="btn btn-secondary btn-sm" @click="clearSelection">
            {{ t('admin.userGroups.clearSelection') }}
          </button>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('admin.userGroups.selectedCount', { count: selectedMemberIds.length }) }}
          </span>
        </div>

        <div class="max-h-[420px] overflow-auto rounded-lg border border-gray-200 dark:border-dark-600">
          <div v-if="membersLoading" class="flex justify-center py-8">
            <svg class="h-6 w-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div v-else-if="filteredUsers.length === 0" class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            {{ t('admin.userGroups.noUsers') }}
          </div>
          <table v-else class="w-full text-sm">
            <thead class="sticky top-0 bg-gray-50 dark:bg-dark-700">
              <tr class="border-b border-gray-200 dark:border-dark-600">
                <th class="w-10 px-3 py-2"></th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">ID</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('admin.users.columns.user') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('admin.users.columns.role') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-dark-600">
              <tr
                v-for="user in filteredUsers"
                :key="user.id"
                class="cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700/50"
                @click="toggleMember(user.id)"
              >
                <td class="px-3 py-2">
                  <input
                    type="checkbox"
                    :checked="selectedMemberIds.includes(user.id)"
                    @click.stop="toggleMember(user.id)"
                  />
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-gray-400 dark:text-gray-500">{{ user.id }}</td>
                <td class="px-3 py-2 text-gray-900 dark:text-white">
                  <div>{{ user.email }}</div>
                  <div v-if="user.username" class="text-xs text-gray-400">{{ user.username }}</div>
                </td>
                <td class="px-3 py-2">
                  <span :class="['badge', user.role === 'admin' ? 'badge-purple' : 'badge-gray']">
                    {{ t('admin.users.roles.' + user.role) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="closeMembers" type="button" class="btn btn-secondary">{{ t('common.cancel') }}</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="membersSaving"
            data-testid="user-group-members-save"
            @click="saveMembers"
          >
            <Icon v-if="membersSaving" name="refresh" size="sm" class="mr-1 animate-spin" />
            {{ t('admin.userGroups.saveMembers') }}
          </button>
        </div>
      </template>
    </BaseDialog>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import { useAppStore } from '@/stores/app'
import type { AdminUser, UserGroup } from '@/types'
import { extractApiErrorMessage } from '@/utils/apiError'
import AppLayout from '@/components/layout/AppLayout.vue'
import TablePageLayout from '@/components/layout/TablePageLayout.vue'
import DataTable from '@/components/common/DataTable.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const appStore = useAppStore()

const loading = ref(false)
const saving = ref(false)
const groups = ref<UserGroup[]>([])
const searchQuery = ref('')

const columns = computed(() => [
  { key: 'name', label: t('admin.userGroups.name'), sortable: false },
  { key: 'code', label: t('admin.userGroups.code'), sortable: false },
  { key: 'description', label: t('admin.userGroups.descriptionLabel'), sortable: false },
  { key: 'member_count', label: t('admin.userGroups.memberCount'), sortable: false },
  { key: 'status', label: t('admin.userGroups.status'), sortable: false },
  { key: 'actions', label: t('admin.userGroups.actions'), sortable: false }
])

const filteredGroups = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return groups.value
  return groups.value.filter(
    g => g.name.toLowerCase().includes(keyword) || g.code.toLowerCase().includes(keyword)
  )
})

const totalMembers = computed(() => groups.value.reduce((sum, g) => sum + (g.member_count ?? 0), 0))

const load = async () => {
  loading.value = true
  try {
    groups.value = await adminAPI.userGroups.list()
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, t('admin.userGroups.failedToLoad')))
    console.error('Error loading user groups:', error)
  } finally {
    loading.value = false
  }
}

// ---------------- create / edit ----------------
const showEditDialog = ref(false)
const isEditing = ref(false)
const editingGroup = ref<UserGroup | null>(null)
const form = reactive({ name: '', description: '' })
const editingIsSystem = computed(() => !!editingGroup.value?.is_system)

const openCreate = () => {
  isEditing.value = false
  editingGroup.value = null
  form.name = ''
  form.description = ''
  showEditDialog.value = true
}

const openEdit = (group: UserGroup) => {
  isEditing.value = true
  editingGroup.value = group
  form.name = group.name
  form.description = group.description
  showEditDialog.value = true
}

const closeEdit = () => {
  showEditDialog.value = false
}

const handleSave = async () => {
  if (!form.name.trim()) {
    appStore.showError(t('admin.userGroups.nameRequired'))
    return
  }
  saving.value = true
  try {
    if (isEditing.value && editingGroup.value) {
      await adminAPI.userGroups.update(editingGroup.value.id, {
        name: editingGroup.value.is_system ? undefined : form.name.trim(),
        description: form.description
      })
      appStore.showSuccess(t('admin.userGroups.updated'))
    } else {
      await adminAPI.userGroups.create({ name: form.name.trim(), description: form.description })
      appStore.showSuccess(t('admin.userGroups.created'))
    }
    closeEdit()
    await load()
  } catch (error) {
    appStore.showError(
      extractApiErrorMessage(error, isEditing.value ? t('admin.userGroups.failedToUpdate') : t('admin.userGroups.failedToCreate'))
    )
    console.error('Error saving user group:', error)
  } finally {
    saving.value = false
  }
}

const handleDelete = async (group: UserGroup) => {
  if (group.is_system) return
  if (!window.confirm(t('admin.userGroups.deleteConfirm', { name: group.name }))) return
  try {
    await adminAPI.userGroups.remove(group.id)
    appStore.showSuccess(t('admin.userGroups.deleted'))
    await load()
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, t('admin.userGroups.failedToDelete')))
    console.error('Error deleting user group:', error)
  }
}

// ---------------- members ----------------
const showMembersDialog = ref(false)
const membersGroup = ref<UserGroup | null>(null)
const membersLoading = ref(false)
const membersSaving = ref(false)
const memberSearch = ref('')
const allUsers = ref<AdminUser[]>([])
const selectedMemberIds = ref<number[]>([])

const filteredUsers = computed(() => {
  const keyword = memberSearch.value.trim().toLowerCase()
  if (!keyword) return allUsers.value
  return allUsers.value.filter(
    u => u.email.toLowerCase().includes(keyword) || (u.username ?? '').toLowerCase().includes(keyword)
  )
})

const openMembers = async (group: UserGroup) => {
  membersGroup.value = group
  showMembersDialog.value = true
  membersLoading.value = true
  memberSearch.value = ''
  selectedMemberIds.value = []
  try {
    const [members, usersPage] = await Promise.all([
      adminAPI.userGroups.listMembers(group.id),
      adminAPI.users.list(1, 200)
    ])
    selectedMemberIds.value = [...members]
    allUsers.value = usersPage.items
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, t('admin.userGroups.failedToLoad')))
    console.error('Error loading user group members:', error)
  } finally {
    membersLoading.value = false
  }
}

const closeMembers = () => {
  showMembersDialog.value = false
  membersGroup.value = null
  allUsers.value = []
  selectedMemberIds.value = []
}

const toggleMember = (userId: number) => {
  const idx = selectedMemberIds.value.indexOf(userId)
  if (idx >= 0) {
    selectedMemberIds.value.splice(idx, 1)
  } else {
    selectedMemberIds.value.push(userId)
  }
}

const selectAllVisible = () => {
  for (const user of filteredUsers.value) {
    if (!selectedMemberIds.value.includes(user.id)) selectedMemberIds.value.push(user.id)
  }
}

const clearSelection = () => {
  selectedMemberIds.value = []
}

const saveMembers = async () => {
  if (!membersGroup.value) return
  membersSaving.value = true
  try {
    await adminAPI.userGroups.syncMembers(membersGroup.value.id, [...selectedMemberIds.value])
    appStore.showSuccess(t('admin.userGroups.membersSaved'))
    closeMembers()
    await load()
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, t('admin.userGroups.failedToSaveMembers')))
    console.error('Error saving user group members:', error)
  } finally {
    membersSaving.value = false
  }
}

onMounted(load)
</script>
