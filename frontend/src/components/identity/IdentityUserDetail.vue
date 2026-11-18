<template>
  <BaseDialog :show="true" :title="detail?.user.username || t('identity.userDetails')" placement="right" width="wide" :show-close-button="!busy" :close-on-escape="!busy" @close="emit('close')">
    <p v-if="loading" role="status" class="py-8 text-center text-sm">{{ t('common.loading') }}</p>
    <div v-else-if="detail" class="space-y-5">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p class="break-all text-sm text-gray-500 dark:text-gray-400">{{ detail.user.email }}</p>
        <span :class="['badge', detail.user.enabled ? 'badge-success' : 'badge-gray']">{{ t(detail.user.enabled ? 'identity.enabled' : 'identity.disabled') }}</span>
        <span v-if="detail.user.protected" class="badge badge-gray">{{ t('identity.protected') }}</span>
      </div>
      <p v-if="detail.user.protected" class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.protectedHint') }}</p>
      <div class="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-dark-700" role="group" :aria-label="t('identity.userDetails')">
        <button v-for="section in sections" :key="section" class="btn btn-sm" :class="tab === section ? 'btn-primary' : 'btn-secondary'" :aria-pressed="tab === section" @click="tab = section">{{ t(`identity.${section}`) }}</button>
      </div>
      <section v-if="tab === 'profile'" class="space-y-5">
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div><dt class="text-gray-500 dark:text-gray-400">{{ t('identity.firstName') }}</dt><dd class="mt-1 break-words">{{ detail.user.firstName || '—' }}</dd></div>
          <div><dt class="text-gray-500 dark:text-gray-400">{{ t('identity.lastName') }}</dt><dd class="mt-1 break-words">{{ detail.user.lastName || '—' }}</dd></div>
          <div><dt class="text-gray-500 dark:text-gray-400">{{ t('identity.emailVerified') }}</dt><dd class="mt-1">{{ t(detail.user.emailVerified ? 'identity.verified' : 'identity.unverified') }}</dd></div>
          <div><dt class="text-gray-500 dark:text-gray-400">{{ t('identity.created') }}</dt><dd class="mt-1">{{ date(detail.user.createdTimestamp) }}</dd></div>
        </dl>
        <div v-if="!detail.user.protected" class="flex flex-wrap gap-2">
          <button class="btn btn-secondary" @click="editing = true">{{ t('identity.editUser') }}</button>
          <button class="btn btn-secondary text-red-600 dark:text-red-400" @click="prepare('delete')">{{ t('identity.deleteUser') }}</button>
        </div>
      </section>

      <section v-if="tab === 'security'" class="space-y-5">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">{{ t('identity.requiredAction') }}</h2>
            <button v-if="!detail.user.protected" class="btn btn-secondary btn-sm" @click="prepare('password')">{{ t('identity.resetPassword') }}</button>
          </div>
          <ul v-if="detail.user.requiredActions?.length" class="list-disc space-y-1 pl-5 text-sm">
            <li v-for="action in detail.user.requiredActions" :key="action" class="break-all">{{ translated('requiredActions', action) }}</li>
          </ul>
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.none') }}</p>
        </div>
        <div class="border-t border-gray-200 pt-4 dark:border-dark-700">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-semibold">{{ t('identity.emailVerified') }}</h2>
              <span :class="['badge', detail.user.emailVerified ? 'badge-success' : 'badge-gray']">{{ t(detail.user.emailVerified ? 'identity.verified' : 'identity.unverified') }}</span>
            </div>
            <button
              v-if="!detail.user.protected && detail.user.enabled && detail.user.email && !detail.user.emailVerified && realm?.emailDeliveryConfigured"
              class="btn btn-secondary btn-sm"
              @click="prepare('verify')"
            >{{ t('identity.sendVerification') }}</button>
          </div>
          <p v-if="realm && !realm.emailDeliveryConfigured && !detail.user.emailVerified" class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ t('identity.errors.identity_email_delivery_disabled') }}</p>
        </div>
        <div class="border-t border-gray-200 pt-4 dark:border-dark-700">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold">{{ t('identity.authentication') }}</h2>
            <button class="btn btn-secondary btn-sm" :disabled="securityLoading || busy" @click="loadSecurity">{{ t('common.refresh') }}</button>
          </div>
          <p v-if="securityLoading" role="status" class="mt-3 text-sm">{{ t('common.loading') }}</p>
          <p v-else-if="securityError" role="alert" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ securityError }}</p>
          <dl v-else-if="security" class="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-gray-500 dark:text-gray-400">{{ t('identity.credentials') }}</dt>
              <dd class="mt-1 break-words">{{ security.credentialTypes.map(type => translated('credentialTypes', type)).join(' · ') || t('identity.none') }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">{{ t('identity.providers') }}</dt>
              <dd class="mt-1 break-words">{{ security.providers.join(' · ') || t('identity.none') }}</dd>
            </div>
          </dl>
        </div>
        <div v-if="security" class="space-y-3 border-t border-gray-200 pt-4 dark:border-dark-700">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">{{ t('identity.loginProtection') }}</h2>
            <button v-if="!detail.user.protected && security.loginFailures && (security.loginFailures.disabled || security.loginFailures.numFailures > 0)" class="btn btn-secondary btn-sm" @click="prepare('clearFailures')">{{ t('identity.clearFailures') }}</button>
          </div>
          <dl v-if="security.loginFailures" class="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-gray-500 dark:text-gray-400">{{ t('identity.failedSignIns') }}</dt>
              <dd class="mt-1">{{ security.loginFailures.numFailures }}<span v-if="security.loginFailures.disabled" class="ml-2 text-amber-700 dark:text-amber-400">{{ t('identity.loginLocked') }}</span></dd>
            </div>
            <div><dt class="text-gray-500 dark:text-gray-400">{{ t('identity.lastFailedSignIn') }}</dt><dd class="mt-1">{{ date(security.loginFailures.lastFailure) }}</dd></div>
          </dl>
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.errors.identity_login_protection_disabled') }}</p>
        </div>
      </section>

      <IdentityMitoPermissions v-if="tab === 'mito'" :id="id" :step-up="stepUp" @changed="emit('changed')" />

      <section v-if="tab === 'groups'" class="space-y-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.uniqueGroupHint') }}</p>
        <p v-if="groupsLoading" role="status" class="py-4 text-sm">{{ t('common.loading') }}</p>
        <p v-else-if="groupsError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ groupsError }} <button class="underline" @click="loadGroups">{{ t('common.tryAgain') }}</button></p>
        <p v-else-if="!groups?.length" class="py-6 text-sm">{{ t('identity.noGroups') }}</p>
        <label v-for="group in groups" :key="group.id" class="flex items-center justify-between gap-4 border-b border-gray-100 py-3 text-sm dark:border-dark-700">
          <span class="min-w-0 break-words">{{ group.name }}<small v-if="!group.managed" class="ml-2 text-gray-500">{{ t('identity.readOnly') }}</small></span>
          <span class="flex items-center gap-3">
            <button v-if="isMember(group.id) && group.managed" type="button" class="btn btn-secondary btn-sm" :disabled="busy || detail.user.protected" @click.prevent="membership(group.id, false)">{{ t('identity.removeMember') }}</button>
            <input type="radio" name="identity-group" :checked="isMember(group.id)" :disabled="busy || !group.managed || detail.user.protected" @change="membership(group.id, true)" />
          </span>
        </label>
      </section>

      <section v-if="tab === 'applications'" class="space-y-3">
        <p v-if="!detail.applications.length" class="py-6 text-sm">{{ t('identity.noApplications') }}</p>
        <div v-for="app in detail.applications" :key="app.clientId" class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 py-3 dark:border-dark-700">
          <div class="min-w-0">
            <p class="break-words text-sm font-medium">{{ app.name }}</p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ t(app.granted ? (app.inherited ? 'identity.inherited' : 'identity.directAccess') : 'identity.accessDenied') }}
            </p>
          </div>
          <button v-if="!detail.user.protected && !app.inherited" class="btn btn-secondary btn-sm" :disabled="busy" @click="prepareAccess(app)">{{ t(app.granted ? 'identity.revokeAccess' : 'identity.grantAccess') }}</button>
        </div>
      </section>

      <section v-if="tab === 'sessions'" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-medium">{{ t('identity.sessionCount', { count: detail.sessions.length }) }}</h2>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-secondary btn-sm" :disabled="busy" @click="load">{{ t('common.refresh') }}</button>
            <button v-if="!detail.user.protected && detail.sessions.length" class="btn btn-secondary btn-sm" :disabled="busy" @click="prepare('logout')">{{ t('identity.logoutAll') }}</button>
          </div>
        </div>
        <p v-if="!detail.sessions.length" class="py-6 text-sm">{{ t('identity.noSessions') }}</p>
        <div v-for="session in detail.sessions" :key="session.id" class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 py-3 text-sm dark:border-dark-700">
          <div class="min-w-0">
            <p class="break-all font-medium">{{ Object.values(session.clients || {}).join(' · ') || '—' }}</p>
            <dl class="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex flex-wrap gap-x-2"><dt>{{ t('identity.sessionIP') }}</dt><dd>{{ session.ipAddress || '—' }}</dd></div>
              <div class="flex flex-wrap gap-x-2"><dt>{{ t('identity.sessionStarted') }}</dt><dd>{{ date(session.start) }}</dd></div>
              <div class="flex flex-wrap gap-x-2"><dt>{{ t('identity.sessionLastActive') }}</dt><dd>{{ date(session.lastAccess) }}</dd></div>
            </dl>
          </div>
          <button v-if="!detail.user.protected" class="btn btn-secondary btn-sm" :disabled="busy" @click="prepareSession(session)">{{ t('identity.endSession') }}</button>
        </div>
      </section>
    </div>
    <p v-if="error" role="alert" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }} <button class="underline" :disabled="busy" @click="load">{{ t('common.tryAgain') }}</button></p>
  </BaseDialog>

  <IdentityUserEditor v-if="editing && detail" :user="detail.user" :realm="realm" :step-up="stepUp" @close="editing = false" @saved="edited" />
  <BaseDialog v-if="operation" :show="true" :title="operationTitle" :z-index="55" :show-close-button="!busy" :close-on-escape="!busy" @close="closeOperation">
    <form id="identity-operation-form" class="space-y-4" @submit.prevent="execute">
      <p class="break-words text-sm font-medium">{{ detail?.user.username }}</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">{{ t(`identity.${operation}Hint`, { app: selectedApp?.name, email: detail?.user.email }) }}</p>
      <p v-if="operation === 'session' && selectedSession" class="break-all text-sm">{{ selectedSession.ipAddress || '—' }} · {{ date(selectedSession.start) }}</p>
      <template v-if="operation === 'password'">
        <label class="block text-sm">{{ t('identity.password') }}<input v-model="password" class="input mt-1" type="password" required minlength="8" maxlength="256" autocomplete="new-password" :disabled="busy" /></label>
        <label class="flex items-center gap-2 text-sm"><input v-model="temporary" type="checkbox" :disabled="busy" />{{ t('identity.temporaryPassword') }}</label>
      </template>
      <label v-if="operation === 'delete'" class="block text-sm">{{ t('identity.confirmUsername') }}<input v-model="confirmation" class="input mt-1" required autocomplete="off" :disabled="busy" /></label>
      <p v-if="actionError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>
    </form>
    <template #footer>
      <button class="btn btn-secondary" :disabled="busy" @click="closeOperation">{{ t(changedWithoutLogout ? 'common.close' : 'common.cancel') }}</button>
      <button v-if="!changedWithoutLogout" class="btn btn-primary" form="identity-operation-form" :disabled="busy || (operation === 'delete' && confirmation !== detail?.user.username)">{{ t(busy ? 'common.saving' : 'common.confirm') }}</button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import IdentityUserEditor from './IdentityUserEditor.vue'
import IdentityMitoPermissions from './IdentityMitoPermissions.vue'
import {
  identityAPI, identityErrorKey, type IdentityAccess, type IdentityDetail, type IdentityGroup,
  type IdentityRealm, type IdentitySecurity, type IdentitySession
} from '@/api/identity'
import { isStepUpCancelled, type StepUpController } from '@/composables/useStepUp'
import { useAppStore } from '@/stores/app'

const sections = ['profile', 'mito', 'security', 'groups', 'applications', 'sessions'] as const
type Section = (typeof sections)[number]
type Operation = 'password' | 'delete' | 'logout' | 'session' | 'access' | 'verify' | 'clearFailures'
const props = defineProps<{ id: string; initialSection: Section; realm?: IdentityRealm; stepUp: StepUpController }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const { t, te, locale } = useI18n()
const appStore = useAppStore()
const tab = ref<Section>(props.initialSection)
const detail = ref<IdentityDetail>()
const groups = ref<IdentityGroup[]>()
const security = ref<IdentitySecurity>()
const loading = ref(true)
const groupsLoading = ref(false)
const securityLoading = ref(false)
const busy = ref(false)
const error = ref('')
const groupsError = ref('')
const securityError = ref('')
const editing = ref(false)
const operation = ref<Operation>()
const selectedApp = ref<IdentityAccess>()
const selectedSession = ref<IdentitySession>()
const password = ref('')
const temporary = ref(true)
const confirmation = ref('')
const actionError = ref('')
const changedWithoutLogout = ref(false)
const operationTitle = computed(() => t({
  password: 'identity.resetPassword',
  delete: 'identity.deleteUser',
  logout: 'identity.logoutAll',
  session: 'identity.endSession',
  access: selectedApp.value?.granted ? 'identity.revokeAccess' : 'identity.grantAccess',
  verify: 'identity.sendVerification',
  clearFailures: 'identity.clearFailures'
}[operation.value || 'password']))
function date(value: number) {
  return value ? new Date(value < 1e12 ? value * 1000 : value).toLocaleString(locale.value) : '—'
}
function translated(section: 'requiredActions' | 'credentialTypes', value: string) {
  const key = `identity.${section}.${value}`
  return te(key) ? t(key) : value
}
const isMember = (id: string) => !!detail.value?.groups.some(group => group.id === id)

async function load() {
  loading.value = true
  error.value = ''
  try { detail.value = await identityAPI.detail(props.id) }
  catch (e) { error.value = t(identityErrorKey(e)); detail.value = undefined }
  finally { loading.value = false }
}
async function loadGroups() {
  if (groupsLoading.value) return
  groupsLoading.value = true
  groupsError.value = ''
  try { groups.value = await identityAPI.groups() }
  catch (e) { groupsError.value = t(identityErrorKey(e)) }
  finally { groupsLoading.value = false }
}
async function loadSecurity() {
  if (securityLoading.value) return
  securityLoading.value = true
  securityError.value = ''
  try { security.value = await identityAPI.security(props.id) }
  catch (e) { securityError.value = t(identityErrorKey(e)); security.value = undefined }
  finally { securityLoading.value = false }
}
async function edited() {
  editing.value = false
  emit('changed')
  await load()
}
function prepare(value: Operation) {
  operation.value = value
  password.value = ''
  confirmation.value = ''
  temporary.value = true
  actionError.value = ''
  changedWithoutLogout.value = false
}
function prepareAccess(app: IdentityAccess) {
  selectedApp.value = app
  prepare('access')
}
function prepareSession(session: IdentitySession) {
  selectedSession.value = session
  prepare('session')
}
function closeOperation() {
  if (busy.value) return
  operation.value = undefined
  password.value = ''
  confirmation.value = ''
}
async function membership(id: string, member: boolean) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await props.stepUp.run(() => identityAPI.membership(props.id, id, member))
    await load()
  } catch (e) {
    if (!isStepUpCancelled(e)) error.value = t(identityErrorKey(e))
  } finally {
    busy.value = false
  }
}
async function execute() {
  const action = operation.value
  if (busy.value || changedWithoutLogout.value || !action) return
  busy.value = true
  actionError.value = ''
  try {
    await props.stepUp.run(async () => {
      switch (action) {
        case 'password': await identityAPI.password(props.id, password.value, temporary.value); break
        case 'delete': await identityAPI.deleteUser(props.id, confirmation.value); break
        case 'logout': await identityAPI.logout(props.id); break
        case 'session': await identityAPI.sessionLogout(props.id, selectedSession.value!.id); break
        case 'access': await identityAPI.access(props.id, selectedApp.value!.clientId, !selectedApp.value!.granted); break
        case 'verify': await identityAPI.verifyEmail(props.id); break
        case 'clearFailures': await identityAPI.clearLoginFailures(props.id); break
      }
    })
    operation.value = undefined
    appStore.showSuccess(t(action === 'verify' ? 'identity.verificationSent' : action === 'session' ? 'identity.sessionEnded' : 'identity.saved'))
    if (action === 'delete' || action === 'access') emit('changed')
    if (action === 'delete') emit('close')
    else if (action === 'clearFailures') await loadSecurity()
    else if (action !== 'verify') {
      await load()
      if (action === 'password' && tab.value === 'security') await loadSecurity()
    }
  } catch (e) {
    if (!isStepUpCancelled(e)) {
      const key = identityErrorKey(e)
      actionError.value = t(key)
      if (key === 'identity.errors.identity_changed_logout_failed') {
        changedWithoutLogout.value = true
        if (action === 'access') emit('changed')
        await load()
        if (action === 'password' && tab.value === 'security') await loadSecurity()
      }
    }
  } finally {
    password.value = ''
    busy.value = false
  }
}
watch(tab, section => {
  if (section === 'groups' && !groups.value) void loadGroups()
  if (section === 'security') void loadSecurity()
})
onMounted(load)
</script>
