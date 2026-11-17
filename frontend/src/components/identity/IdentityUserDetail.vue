<template>
  <BaseDialog :show="true" :title="detail?.user.username || t('identity.userDetails')" placement="right" width="wide" :show-close-button="!busy" :close-on-escape="!busy" @close="$emit('close')">
    <p v-if="loading" role="status" class="py-8 text-center text-sm">{{ t('common.loading') }}</p>
    <div v-else-if="detail" class="space-y-5">
      <div>
        <p class="break-all text-sm text-gray-500 dark:text-gray-400">{{ detail.user.email }}</p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span :class="['badge', detail.user.enabled ? 'badge-success' : 'badge-gray']">{{ t(detail.user.enabled ? 'identity.enabled' : 'identity.disabled') }}</span>
          <span v-if="detail.user.protected" class="badge badge-gray">{{ t('identity.protected') }}</span>
        </div>
      </div>
      <p v-if="detail.user.protected" class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.protectedHint') }}</p>
      <div class="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-dark-700">
        <button v-for="section in sections" :key="section" class="btn btn-sm" :class="tab === section ? 'btn-primary' : 'btn-secondary'" :aria-pressed="tab === section" @click="tab = section">{{ t(`identity.${section}`) }}</button>
      </div>
      <section v-if="tab === 'profile'" class="space-y-4">
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div><dt class="text-gray-500 dark:text-gray-400">{{ t('identity.firstName') }}</dt><dd class="mt-1 break-words">{{ detail.user.firstName || '—' }}</dd></div>
          <div><dt class="text-gray-500 dark:text-gray-400">{{ t('identity.lastName') }}</dt><dd class="mt-1 break-words">{{ detail.user.lastName || '—' }}</dd></div>
          <div><dt class="text-gray-500 dark:text-gray-400">{{ t('identity.emailVerified') }}</dt><dd class="mt-1">{{ t(detail.user.emailVerified ? 'identity.verified' : 'identity.unverified') }}</dd></div>
          <div><dt class="text-gray-500 dark:text-gray-400">{{ t('identity.created') }}</dt><dd class="mt-1">{{ date(detail.user.createdTimestamp) }}</dd></div>
        </dl>
        <div v-if="!detail.user.protected" class="flex flex-wrap gap-2 pt-3">
          <button class="btn btn-secondary" @click="editing = true">{{ t('identity.editUser') }}</button>
          <button class="btn btn-secondary" @click="prepare('password')">{{ t('identity.resetPassword') }}</button>
          <button class="btn btn-secondary text-red-600 dark:text-red-400" @click="prepare('delete')">{{ t('identity.deleteUser') }}</button>
        </div>
      </section>
      <section v-if="tab === 'groups'" class="space-y-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.groupHint') }}</p>
        <p v-if="!groups.length" class="py-6 text-sm">{{ t('identity.noGroups') }}</p>
        <label v-for="group in groups" :key="group.id" class="flex items-center justify-between gap-4 border-b border-gray-100 py-3 text-sm dark:border-dark-700">
          <span class="min-w-0 break-words">{{ group.name }}<small v-if="!group.managed" class="ml-2 text-gray-500">{{ t('identity.readOnly') }}</small></span>
          <input type="checkbox" :checked="isMember(group.id)" :disabled="busy || !group.managed || detail.user.protected" @change="membership(group.id, !isMember(group.id))" />
        </label>
      </section>
      <section v-if="tab === 'applications'" class="space-y-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.applicationHint') }}</p>
        <div v-for="app in detail.applications" :key="app.clientId" class="flex items-center justify-between gap-4 border-b border-gray-100 py-3 dark:border-dark-700">
          <div class="min-w-0"><p class="text-sm font-medium">{{ app.name }}</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t(app.granted ? 'identity.accessGranted' : 'identity.accessDenied') }}<span v-if="app.inherited"> · {{ t('identity.inherited') }}</span></p></div>
          <button class="btn btn-secondary btn-sm" :disabled="busy || detail.user.protected || app.inherited" @click="prepareAccess(app)">{{ t(app.granted ? 'identity.revokeAccess' : 'identity.grantAccess') }}</button>
        </div>
      </section>
      <section v-if="tab === 'sessions'" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-sm font-medium">{{ t('identity.sessionCount', { count: detail.sessions.length }) }}</h2><button class="btn btn-secondary btn-sm" :disabled="busy || detail.user.protected || !detail.sessions.length" @click="prepare('logout')">{{ t('identity.logoutAll') }}</button></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.sessionHint') }}</p>
        <p v-if="!detail.sessions.length" class="py-6 text-sm">{{ t('identity.noSessions') }}</p>
        <div v-for="session in detail.sessions" :key="session.id" class="border-b border-gray-100 py-3 text-sm dark:border-dark-700">
          <p class="break-all">{{ Object.values(session.clients || {}).join(' · ') || '—' }}</p>
          <p class="mt-1 text-gray-500 dark:text-gray-400">{{ session.ipAddress || '—' }} · {{ date(session.lastAccess) }}</p>
        </div>
      </section>
    </div>
    <p v-if="error" role="alert" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }} <button class="underline" :disabled="busy" @click="load">{{ t('common.tryAgain') }}</button></p>
  </BaseDialog>

  <IdentityUserEditor v-if="editing && detail" :user="detail.user" @close="editing = false" @saved="edited" />
  <BaseDialog v-if="operation" :show="true" :title="operationTitle" :show-close-button="!busy" :close-on-escape="!busy" @close="closeOperation">
    <form id="identity-operation-form" class="space-y-4" @submit.prevent="execute">
      <p class="break-words text-sm font-medium">{{ detail?.user.username }}</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">{{ t(`identity.${operation}Hint`, { app: selectedApp?.name }) }}</p>
      <label v-if="operation === 'password'" class="block text-sm">{{ t('identity.password') }}<input v-model="password" class="input mt-1" type="password" required minlength="8" maxlength="256" autocomplete="new-password" :disabled="busy" /></label>
      <label v-if="operation === 'delete'" class="block text-sm">{{ t('identity.confirmUsername') }}<input v-model="confirmation" class="input mt-1" required autocomplete="off" :disabled="busy" /></label>
      <p v-if="actionError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>
    </form>
    <template #footer><button class="btn btn-secondary" :disabled="busy" @click="closeOperation">{{ t('common.cancel') }}</button><button class="btn btn-primary" form="identity-operation-form" :disabled="busy || (operation === 'delete' && confirmation !== detail?.user.username)">{{ t(busy ? 'common.saving' : 'common.confirm') }}</button></template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import IdentityUserEditor from './IdentityUserEditor.vue'
import { identityAPI, identityErrorKey, type IdentityAccess, type IdentityDetail, type IdentityGroup } from '@/api/identity'
import { useAppStore } from '@/stores/app'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const { t, locale } = useI18n()
const appStore = useAppStore()
const sections = ['profile', 'groups', 'applications', 'sessions'] as const
const tab = ref<(typeof sections)[number]>('profile')
const detail = ref<IdentityDetail>()
const groups = ref<IdentityGroup[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const editing = ref(false)
type Operation = 'password' | 'delete' | 'logout' | 'access'
const operation = ref<Operation>()
const selectedApp = ref<IdentityAccess>()
const password = ref('')
const confirmation = ref('')
const actionError = ref('')
const operationTitle = computed(() => t({ password: 'identity.resetPassword', delete: 'identity.deleteUser', logout: 'identity.logoutAll', access: selectedApp.value?.granted ? 'identity.revokeAccess' : 'identity.grantAccess' }[operation.value || 'password']))
function date(value: number) { return value ? new Date(value < 1e12 ? value * 1000 : value).toLocaleString(locale.value) : '—' }
const isMember = (id: string) => !!detail.value?.groups.some(group => group.id === id)
async function load() {
  loading.value = true
  error.value = ''
  try { [detail.value, groups.value] = await Promise.all([identityAPI.detail(props.id), identityAPI.groups()]) }
  catch (e) { error.value = t(identityErrorKey(e)); detail.value = undefined }
  finally { loading.value = false }
}
async function edited() { editing.value = false; emit('changed'); await load() }
function prepare(value: Operation) { operation.value = value; password.value = ''; confirmation.value = ''; actionError.value = '' }
function prepareAccess(app: IdentityAccess) { selectedApp.value = app; prepare('access') }
function closeOperation() { if (!busy.value) { operation.value = undefined; password.value = ''; confirmation.value = '' } }
async function membership(id: string, member: boolean) {
  busy.value = true
  error.value = ''
  try { await identityAPI.membership(props.id, id, member); await load(); emit('changed') }
  catch (e) { error.value = t(identityErrorKey(e)) }
  finally { busy.value = false }
}
async function execute() {
  busy.value = true
  actionError.value = ''
  const action = operation.value
  try {
    if (action === 'password') await identityAPI.password(props.id, password.value)
    else if (action === 'delete') await identityAPI.deleteUser(props.id, confirmation.value)
    else if (action === 'logout') await identityAPI.logout(props.id)
    else if (action === 'access' && selectedApp.value) await identityAPI.access(props.id, selectedApp.value.clientId, !selectedApp.value.granted)
    password.value = ''
    operation.value = undefined
    appStore.showSuccess(t('identity.saved'))
    emit('changed')
    if (action === 'delete') emit('close')
    else await load()
  } catch (e) { actionError.value = t(identityErrorKey(e)); password.value = '' }
  finally { busy.value = false }
}
onMounted(load)
</script>
