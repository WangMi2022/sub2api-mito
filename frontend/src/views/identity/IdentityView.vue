<template>
  <AppLayout>
    <template #heading-actions>
      <button v-if="tab === 'users'" class="btn btn-primary" :disabled="!overview" @click="creating = true"><Icon name="plus" size="sm" class="mr-1" />{{ t('identity.createUser') }}</button>
    </template>
    <div class="mito-identity-console space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div><h1 v-if="!isMitoTheme" class="text-xl font-semibold text-gray-900 dark:text-white">{{ t('identity.title') }}</h1><p class="text-sm text-gray-500 dark:text-gray-400">{{ overview?.realm.displayName || overview?.realm.realm || t('identity.subtitle') }}</p></div>
        <button v-if="!isMitoTheme && tab === 'users'" class="btn btn-primary" :disabled="!overview" @click="creating = true"><Icon name="plus" size="sm" class="mr-1" />{{ t('identity.createUser') }}</button>
      </div>
      <nav class="flex gap-5 overflow-x-auto whitespace-nowrap border-b border-gray-200 dark:border-dark-700" :aria-label="t('identity.title')">
        <button v-for="section in tabs" :key="section" class="border-b-2 pb-3 text-sm" :class="tab === section ? 'border-primary-500 font-medium text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400'" :aria-current="tab === section ? 'page' : undefined" @click="tab = section">{{ t(`identity.${section}`) }}</button>
      </nav>
      <p v-if="overviewError" role="alert" class="text-sm text-red-600 dark:text-red-400">
        {{ overviewError }} <button class="underline" @click="loadOverview">{{ t('common.tryAgain') }}</button>
      </p>
      <TablePageLayout v-if="tab === 'users'" class="mito-identity-users">
        <template #filters>
          <form class="mito-identity-toolbar flex flex-wrap items-center gap-3" @submit.prevent="search">
            <div class="mito-identity-filters flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <label class="mito-identity-search relative w-full md:w-64">
                <span class="sr-only">{{ t('identity.search') }}</span>
                <Icon name="search" size="md" aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input v-model="query" class="input pl-10" maxlength="120" :placeholder="t('identity.search')" type="search" />
              </label>
              <div class="mito-identity-filter w-full sm:w-40">
                <Select
                  v-model="enabled"
                  :aria-label="t('identity.status')"
                  :options="[
                    { value: '', label: t('identity.allStatuses') },
                    { value: 'true', label: t('identity.enabled') },
                    { value: 'false', label: t('identity.disabled') }
                  ]"
                  @change="search"
                />
              </div>
              <div class="mito-identity-filter w-full sm:w-44">
                <Select
                  v-model="emailVerified"
                  :aria-label="t('identity.emailVerified')"
                  :options="[
                    { value: '', label: t('identity.allEmailStatuses') },
                    { value: 'true', label: t('identity.verified') },
                    { value: 'false', label: t('identity.unverified') }
                  ]"
                  @change="search"
                />
              </div>
            </div>
            <div class="mito-identity-toolbar-actions flex items-center gap-2">
              <button class="btn btn-secondary" :disabled="loading">{{ t('common.search') }}</button>
              <button type="button" class="mito-identity-refresh btn btn-secondary btn-icon" :disabled="loading" :aria-label="t('common.refresh')" :title="t('common.refresh')" @click="load">
                <Icon name="refresh" size="md" aria-hidden="true" :class="{ 'animate-spin': loading }" />
              </button>
            </div>
          </form>
          <p v-if="error" role="alert" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        </template>
        <template #table>
          <DataTable :columns="columns" :data="page.users" :loading="loading" row-key="id">
            <template #cell-username="{ row }">
              <button class="mito-identity-account flex min-w-0 items-center gap-3 text-left" @click="openUser(row.id)">
                <span class="mito-identity-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300" aria-hidden="true">{{ Array.from(String(row.username))[0]?.toUpperCase() || '?' }}</span>
                <span class="min-w-0">
                  <span class="mito-identity-username block truncate font-medium text-gray-900 dark:text-white" :title="row.username">{{ row.username }}</span>
                  <span v-if="row.firstName || row.lastName" class="mito-identity-name mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400" :title="[row.firstName, row.lastName].filter(Boolean).join(' ')">{{ [row.firstName, row.lastName].filter(Boolean).join(' ') }}</span>
                </span>
              </button>
            </template>
            <template #cell-email="{ row }">
              <span class="mito-identity-email text-sm text-gray-600 dark:text-gray-300" :title="row.email">{{ row.email || '—' }}</span>
            </template>
            <template #cell-emailVerified="{ row }">
              <span :class="['mito-identity-verification badge gap-1.5', row.emailVerified ? 'badge-success' : 'badge-warning']">
                <Icon :name="row.emailVerified ? 'checkCircle' : 'clock'" size="xs" aria-hidden="true" />
                {{ t(row.emailVerified ? 'identity.verified' : 'identity.unverified') }}
              </span>
            </template>
            <template #cell-enabled="{ row }">
              <div class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                <span class="h-2 w-2 shrink-0 rounded-full" :class="row.enabled ? 'bg-green-500' : 'bg-red-500'" aria-hidden="true"></span>
                {{ t(row.enabled ? 'identity.enabled' : 'identity.disabled') }}
              </div>
            </template>
            <template #cell-protected="{ row }">
              <span :class="['badge gap-1.5', row.protected ? 'badge-primary' : 'badge-gray']" :title="t(row.protected ? 'identity.protected' : 'identity.regularUser')">
                <Icon v-if="row.protected" name="shieldKey" size="xs" aria-hidden="true" />
                {{ t(row.protected ? 'identity.protectedBadge' : 'identity.regularBadge') }}
              </span>
            </template>
            <template #cell-actions="{ row }">
              <button class="mito-identity-manage inline-flex items-center gap-1.5 rounded-lg p-2 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20" @click="openUser(row.id)">
                <Icon name="userCog" size="sm" aria-hidden="true" />
                {{ t('identity.manageUser') }}
              </button>
            </template>
            <template #empty>
              <EmptyState :title="t(error ? 'identity.loadFailed' : 'identity.noUsers')" :description="error ? '' : t('identity.searchHint')">
                <template #icon><Icon :name="error ? 'exclamationCircle' : 'users'" size="xl" class="h-10 w-10 text-gray-400" aria-hidden="true" /></template>
              </EmptyState>
            </template>
          </DataTable>
        </template>
        <template #pagination>
          <div class="mito-identity-pagination flex flex-wrap items-center justify-between gap-3 text-sm">
            <span class="text-gray-500 dark:text-gray-400" role="status">{{ t('identity.shownUsers', { count: page.users.length }) }}</span>
            <div v-if="first > 0 || page.hasMore" class="flex items-center gap-2">
              <button class="btn btn-secondary btn-sm" :disabled="loading || first === 0" @click="navigate(-50)"><Icon name="chevronLeft" size="sm" aria-hidden="true" />{{ t('pagination.previous') }}</button>
              <span class="mito-identity-page-number rounded-lg bg-primary-50 px-3 py-2 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300" :aria-label="t('pagination.goToPage', { page: Math.floor(first / 50) + 1 })" aria-current="page">{{ Math.floor(first / 50) + 1 }}</span>
              <button class="btn btn-secondary btn-sm" :disabled="loading || !page.hasMore" @click="navigate(50)">{{ t('pagination.next') }}<Icon name="chevronRight" size="sm" aria-hidden="true" /></button>
            </div>
          </div>
        </template>
      </TablePageLayout>
      <IdentityLoginPolicy v-if="tab === 'loginPolicy'" :step-up="stepUp" />
      <IdentityGroups v-if="tab === 'groups'" :step-up="stepUp" />
      <IdentityAccessOverview v-if="tab === 'applications' && overview" :applications="overview.applications" :revision="revision" @open-user="openUser($event, 'applications')" />
    </div>
    <IdentityUserEditor v-if="creating" :realm="overview?.realm" :step-up="stepUp" @close="creating = false" @saved="created" />
    <IdentityUserDetail v-if="selected" :key="selected.id" :id="selected.id" :initial-section="selected.section" :realm="overview?.realm" :step-up="stepUp" @close="selected = undefined" @changed="userChanged" />
    <Teleport to="body"><TotpStepUpDialog :controller="stepUp" /></Teleport>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import IdentityLoginPolicy from '@/components/identity/IdentityLoginPolicy.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import TablePageLayout from '@/components/layout/TablePageLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import DataTable from '@/components/common/DataTable.vue'
import Select from '@/components/common/Select.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import IdentityGroups from '@/components/identity/IdentityGroups.vue'
import IdentityAccessOverview from '@/components/identity/IdentityAccessOverview.vue'
import IdentityUserEditor from '@/components/identity/IdentityUserEditor.vue'
import IdentityUserDetail from '@/components/identity/IdentityUserDetail.vue'
import TotpStepUpDialog from '@/components/auth/TotpStepUpDialog.vue'
import { useStepUp } from '@/composables/useStepUp'
import { isMitoTheme } from '@/themes/mito'
import { identityAPI, identityErrorKey, type IdentityOverview, type IdentityPage } from '@/api/identity'
const { t } = useI18n()
const stepUp = useStepUp()
const tabs = ['users', 'groups', 'applications', 'loginPolicy'] as const
const tab = ref<(typeof tabs)[number]>(useRoute().query.tab === 'loginPolicy' ? 'loginPolicy' : 'users')
const overview = ref<IdentityOverview>()
const page = ref<IdentityPage>({ users: [], first: 0, hasMore: false })
const query = ref('')
const appliedQuery = ref('')
const enabled = ref('')
const emailVerified = ref('')
const first = ref(0)
const loading = ref(true)
const error = ref('')
const overviewError = ref('')
const creating = ref(false)
const selected = ref<{ id: string; section: 'profile' | 'mito' | 'applications' }>()
const revision = ref(0)
let generation = 0
const columns = computed(() => [{ key: 'username', label: t('identity.username') }, { key: 'email', label: t('identity.email') }, { key: 'emailVerified', label: t('identity.emailVerified') }, { key: 'enabled', label: t('identity.status') }, { key: 'protected', label: t('identity.management') }, { key: 'actions', label: t('common.actions') }])
async function load() {
  const current = ++generation
  loading.value = true; error.value = ''
  try {
    const result = await identityAPI.users(appliedQuery.value, first.value, { enabled: enabled.value, emailVerified: emailVerified.value })
    if (current === generation) page.value = result
  }
  catch (e) { if (current === generation) { error.value = t(identityErrorKey(e)); page.value = { users: [], first: first.value, hasMore: false } } }
  finally { if (current === generation) loading.value = false }
}
function search() { first.value = 0; appliedQuery.value = query.value.trim(); void load() }
function navigate(delta: number) { first.value = Math.max(0, first.value + delta); void load() }
function created() { creating.value = false; search() }
function openUser(id: string, section: 'profile' | 'mito' | 'applications' = 'profile') { selected.value = { id, section } }
function userChanged() {
  revision.value++
  if (tab.value === 'users') void load()
}
async function loadOverview() {
  overviewError.value = ''
  try { overview.value = await identityAPI.overview() }
  catch (e) { overviewError.value = t(identityErrorKey(e)) }
}
watch(tab, (value) => { if (value === 'users') void load() })
onMounted(() => {
  if (tab.value === 'users') void load()
  void loadOverview()
})
onBeforeUnmount(stepUp.onCancel)
</script>
