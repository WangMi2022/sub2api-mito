<template>
  <AppLayout>
    <template #heading-actions>
      <button v-if="tab === 'users'" class="btn btn-primary" @click="creating = true"><Icon name="plus" size="sm" class="mr-1" />{{ t('identity.createUser') }}</button>
    </template>
    <div class="space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div><h1 v-if="!isMitoTheme" class="text-xl font-semibold text-gray-900 dark:text-white">{{ t('identity.title') }}</h1><p class="text-sm text-gray-500 dark:text-gray-400">{{ overview?.realm.displayName || overview?.realm.realm || t('identity.subtitle') }}</p></div>
        <button v-if="!isMitoTheme && tab === 'users'" class="btn btn-primary" @click="creating = true"><Icon name="plus" size="sm" class="mr-1" />{{ t('identity.createUser') }}</button>
      </div>
      <nav class="flex gap-5 overflow-x-auto whitespace-nowrap border-b border-gray-200 dark:border-dark-700" :aria-label="t('identity.title')">
        <button v-for="section in tabs" :key="section" class="border-b-2 pb-3 text-sm" :class="tab === section ? 'border-primary-500 font-medium text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400'" :aria-current="tab === section ? 'page' : undefined" @click="tab = section">{{ t(`identity.${section}`) }}</button>
      </nav>
      <p v-if="overviewError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ overviewError }}</p>
      <template v-if="tab === 'users'">
        <form class="flex flex-wrap items-center gap-3" @submit.prevent="search">
          <label class="min-w-0 flex-1 sm:max-w-sm"><span class="sr-only">{{ t('identity.search') }}</span><input v-model="query" class="input" maxlength="120" :placeholder="t('identity.search')" type="search" /></label>
          <button class="btn btn-secondary" :disabled="loading">{{ t('common.search') }}</button>
          <button type="button" class="btn btn-secondary ml-auto" :disabled="loading" @click="load"><Icon name="refresh" size="sm" class="mr-1" />{{ t('common.refresh') }}</button>
        </form>
        <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <DataTable :columns="columns" :data="page.users" :loading="loading">
          <template #cell-username="{ row }"><button class="text-left font-medium text-gray-900 hover:underline dark:text-white" @click="selected = row.id">{{ row.username }}</button><p v-if="row.firstName || row.lastName" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ [row.firstName, row.lastName].filter(Boolean).join(' ') }}</p></template>
          <template #cell-enabled="{ row }"><span :class="['badge', row.enabled ? 'badge-success' : 'badge-gray']">{{ t(row.enabled ? 'identity.enabled' : 'identity.disabled') }}</span></template>
          <template #cell-protected="{ row }"><span class="text-sm">{{ t(row.protected ? 'identity.protected' : 'identity.regularUser') }}</span></template>
          <template #cell-actions="{ row }"><button class="btn btn-secondary btn-sm" @click="selected = row.id">{{ t('identity.manageUser') }}</button></template>
          <template #empty><p class="py-8 text-sm">{{ t(error ? 'identity.loadFailed' : 'identity.noUsers') }}</p></template>
        </DataTable>
        <div class="flex items-center justify-between gap-3 text-sm"><span class="text-gray-500 dark:text-gray-400">{{ t('identity.shownUsers', { count: page.users.length }) }}</span><div v-if="first > 0 || page.hasMore" class="flex gap-2"><button class="btn btn-secondary btn-sm" :disabled="loading || first === 0" @click="navigate(-50)">{{ t('common.back') }}</button><button class="btn btn-secondary btn-sm" :disabled="loading || !page.hasMore" @click="navigate(50)">{{ t('common.next') }}</button></div></div>
      </template>
      <IdentityLoginPolicy v-if="tab === 'loginPolicy'" />
      <IdentityGroups v-if="tab === 'groups'" />
      <section v-if="tab === 'applications'" class="max-w-3xl space-y-5">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.applicationHint') }}</p>
        <div v-for="application in overview?.applications" :key="application.clientId" class="flex items-center justify-between gap-4 border-b border-gray-200 py-4 dark:border-dark-700"><div><h2 class="font-medium">{{ application.name }}</h2><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('identity.ssoApplication') }}</p></div><button class="btn btn-secondary btn-sm" @click="tab = 'users'">{{ t('identity.assignAccess') }}</button></div>
        <div class="border-t border-gray-200 pt-5 dark:border-dark-700"><h2 class="text-sm font-medium">{{ t('identity.advancedTitle') }}</h2><p class="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{{ t('identity.advancedHint') }}</p></div>
      </section>
    </div>
    <IdentityUserEditor v-if="creating" @close="creating = false" @saved="created" />
    <IdentityUserDetail v-if="selected" :key="selected" :id="selected" @close="selected = undefined" @changed="load" />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import IdentityLoginPolicy from '@/components/identity/IdentityLoginPolicy.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import DataTable from '@/components/common/DataTable.vue'
import IdentityGroups from '@/components/identity/IdentityGroups.vue'
import IdentityUserEditor from '@/components/identity/IdentityUserEditor.vue'
import IdentityUserDetail from '@/components/identity/IdentityUserDetail.vue'
import { isMitoTheme } from '@/themes/mito'
import { identityAPI, identityErrorKey, type IdentityOverview, type IdentityPage } from '@/api/identity'
const { t } = useI18n()
const tabs = ['users', 'groups', 'applications', 'loginPolicy'] as const
const tab = ref<(typeof tabs)[number]>(useRoute().query.tab === 'loginPolicy' ? 'loginPolicy' : 'users')
const overview = ref<IdentityOverview>()
const page = ref<IdentityPage>({ users: [], first: 0, hasMore: false })
const query = ref('')
const appliedQuery = ref('')
const first = ref(0)
const loading = ref(true)
const error = ref('')
const overviewError = ref('')
const creating = ref(false)
const selected = ref<string>()
let generation = 0
const columns = computed(() => [{ key: 'username', label: t('identity.username') }, { key: 'email', label: t('identity.email') }, { key: 'enabled', label: t('identity.status') }, { key: 'protected', label: t('identity.management') }, { key: 'actions', label: t('common.actions') }])
async function load() {
  const current = ++generation
  loading.value = true; error.value = ''
  try { const result = await identityAPI.users(appliedQuery.value, first.value); if (current === generation) page.value = result }
  catch (e) { if (current === generation) { error.value = t(identityErrorKey(e)); page.value = { users: [], first: first.value, hasMore: false } } }
  finally { if (current === generation) loading.value = false }
}
function search() { first.value = 0; appliedQuery.value = query.value.trim(); void load() }
function navigate(delta: number) { first.value = Math.max(0, first.value + delta); void load() }
function created() { creating.value = false; search() }
onMounted(async () => {
  void load()
  try { overview.value = await identityAPI.overview() }
  catch (e) { overviewError.value = t(identityErrorKey(e)) }
})
</script>
