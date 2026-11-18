<template>
  <section v-if="applications.length" class="space-y-4" :aria-label="t('identity.applications')">
    <div class="flex flex-wrap gap-2" :aria-label="t('identity.applicationName')" role="group">
      <button
        v-for="application in applications"
        :key="application.clientId"
        type="button"
        class="btn btn-sm"
        :class="app?.clientId === application.clientId ? 'btn-primary' : 'btn-secondary'"
        :aria-pressed="app?.clientId === application.clientId"
        @click="select(application.clientId)"
      >
        {{ application.name }}
      </button>
    </div>
    <template v-if="app">
      <dl class="flex flex-wrap gap-x-6 gap-y-2 border-b border-gray-200 pb-4 text-sm dark:border-dark-700">
        <div>
          <dt class="text-gray-500 dark:text-gray-400">{{ t('identity.clientId') }}</dt>
          <dd class="break-all font-mono">{{ app.clientId }}</dd>
        </div>
        <div>
          <dt class="text-gray-500 dark:text-gray-400">{{ t('identity.accessRole') }}</dt>
          <dd class="break-all font-mono">{{ app.accessRole }}</dd>
        </div>
      </dl>
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold">{{ t('identity.effectiveAccounts') }}</h2>
        <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="load">{{ t('common.refresh') }}</button>
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <DataTable :data="page.users" :columns="columns" :loading="loading">
        <template #cell-username="{ row }">
          <button type="button" class="text-left font-medium hover:underline" @click="emit('openUser', row.id)">{{ row.username }}</button>
        </template>
        <template #cell-enabled="{ row }">
          <span :class="['badge', row.enabled ? 'badge-success' : 'badge-gray']">{{ t(row.enabled ? 'identity.enabled' : 'identity.disabled') }}</span>
        </template>
        <template #cell-accessSource="{ row }"><span class="badge" :class="row.accessSource === 'inherited' ? 'badge-primary' : 'badge-gray'">{{ t(row.accessSource === 'inherited' ? 'identity.inherited' : 'identity.directAccessShort') }}</span></template>
        <template #cell-actions="{ row }">
          <button type="button" class="btn btn-secondary btn-sm" @click="emit('openUser', row.id)">{{ t('identity.manageUser') }}</button>
        </template>
        <template #empty>
          <p class="py-8 text-sm">{{ t(error ? 'identity.loadFailed' : 'identity.noEffectiveAccounts') }}</p>
        </template>
      </DataTable>
      <div v-if="first || page.hasMore" class="flex justify-end gap-2">
        <button type="button" class="btn btn-secondary btn-sm" :disabled="loading || !first" @click="navigate(-50)">{{ t('common.back') }}</button>
        <button type="button" class="btn btn-secondary btn-sm" :disabled="loading || !page.hasMore" @click="navigate(50)">{{ t('common.next') }}</button>
      </div>
    </template>
  </section>
  <p v-else class="py-6 text-sm text-gray-500 dark:text-gray-400">{{ t('identity.noApplications') }}</p>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from '@/components/common/DataTable.vue'
import { identityAPI, identityErrorKey, type IdentityApplication, type IdentityPage } from '@/api/identity'

const props = defineProps<{ applications: IdentityApplication[]; revision: number }>()
const emit = defineEmits<{ openUser: [id: string] }>()
const { t } = useI18n()
const selected = ref('')
const app = computed(() => props.applications.find((item) => item.clientId === selected.value) ?? props.applications[0])
const first = ref(0)
const page = ref<IdentityPage>({ users: [], first: 0, hasMore: false })
const loading = ref(false)
const error = ref('')
let generation = 0
const columns = computed(() => [
  { key: 'username', label: t('identity.username') },
  { key: 'email', label: t('identity.email') },
  { key: 'enabled', label: t('identity.status') },
  { key: 'accessSource', label: t('identity.accessSource') },
  { key: 'actions', label: t('common.actions') }
])

async function load() {
  const current = ++generation
  if (!app.value) return
  loading.value = true
  error.value = ''
  try {
    const result = await identityAPI.applicationAccounts(app.value.clientId, first.value)
    if (current === generation) page.value = result
  } catch (e) {
    if (current === generation) {
      page.value = { users: [], first: first.value, hasMore: false }
      error.value = t(identityErrorKey(e))
    }
  } finally {
    if (current === generation) loading.value = false
  }
}
function select(clientId: string) {
  selected.value = clientId
}
function navigate(delta: number) {
  first.value += delta
  void load()
}
watch(() => app.value?.clientId, () => {
  first.value = 0
  void load()
}, { immediate: true })
watch(() => props.revision, load)
</script>
