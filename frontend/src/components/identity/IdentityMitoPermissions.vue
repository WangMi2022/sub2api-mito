<template>
  <section class="mito-identity-permissions space-y-5" :aria-label="t('identity.mito')">
    <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.mitoHint') }}</p>
    <p v-if="loading" role="status" class="py-5 text-sm">{{ t('common.loading') }}</p>
    <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }} <button class="underline" :disabled="busy" @click="load">{{ t('common.tryAgain') }}</button></p>
    <div v-if="data && !data.linked" class="rounded-xl border border-dashed border-gray-300 p-5 text-sm dark:border-dark-600">
      <p class="font-medium">{{ t('identity.mitoNotLinked') }}</p>
      <p class="mt-2 text-gray-500 dark:text-gray-400">{{ t('identity.mitoNotLinkedHint') }}</p>
      <form v-if="!data.protected" class="mt-4 space-y-3" @submit.prevent="linkAccount">
        <fieldset :disabled="busy" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">{{ t('identity.mitoLinkId') }}<input v-model.number="linkId" class="input mt-1" type="number" min="1" required /></label>
            <label class="block">{{ t('identity.mitoLinkEmail') }}<input v-model.trim="linkEmail" class="input mt-1" type="email" autocomplete="off" required /></label>
          </div>
          <label class="block">{{ t('identity.mitoChangeReason') }}<textarea v-model="reason" class="input mt-1" rows="2" minlength="3" maxlength="500" required></textarea></label>
          <button class="btn btn-primary" :disabled="!linkId || !linkEmail || !validReason">{{ t('identity.mitoLink') }}</button>
        </fieldset>
      </form>
      <RouterLink class="mt-3 inline-block text-primary-600 dark:text-primary-400" to="/admin/users">{{ t('identity.manageMitoUsers') }}</RouterLink>
    </div>
    <form v-if="data?.linked && form" class="space-y-5" @submit.prevent="save">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4 dark:bg-dark-800">
        <div class="min-w-0"><p class="break-words text-sm font-semibold">{{ form.username || form.email }}</p><p class="mt-1 text-xs text-gray-500">{{ t('identity.mitoAccountId', { id: form.id }) }}</p></div>
        <span class="badge" :class="data.protected ? 'badge-warning' : 'badge-success'">{{ t(data.protected ? 'identity.protectedBadge' : 'identity.mitoLinked') }}</span>
      </div>
      <p v-if="data.protected" class="text-sm text-amber-700 dark:text-amber-400">{{ t('identity.mitoProtectedHint') }}</p>
      <fieldset :disabled="busy || data.protected" class="space-y-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block text-sm">{{ t('identity.mitoRole') }}
            <select v-model="form.role" class="input mt-1" @change="roleChanged">
              <option v-for="role in ['user', 'admin', 'observer'] as const" :key="role" :value="role">{{ t(`identity.mitoRoles.${role}`) }}</option>
            </select>
          </label>
          <label class="block text-sm">{{ t('identity.mitoStatus') }}
            <select v-model="form.status" class="input mt-1"><option value="active">{{ t('identity.enabled') }}</option><option value="disabled">{{ t('identity.disabled') }}</option></select>
          </label>
          <label class="block text-sm sm:col-span-2">{{ t('identity.mitoUserGroup') }}
            <select v-model.number="form.userGroupId" class="input mt-1">
              <option :value="0">{{ t('identity.mitoNoUserGroup') }}</option>
              <option v-for="group in data.userGroups" :key="group.id" :value="group.id" :disabled="group.status !== 'active'">{{ group.name }}{{ group.status !== 'active' ? ` · ${t('identity.disabled')}` : '' }}</option>
            </select>
          </label>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t(`identity.mitoRoleHints.${form.role}`) }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('identity.mitoStatusHint') }}</p>
        <p v-if="!form.userGroupId" role="status" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">{{ t('identity.mitoUngroupedWarning') }}</p>
        <div class="space-y-3 border-t border-gray-200 pt-4 dark:border-dark-700">
          <h3 class="text-sm font-semibold">{{ t('identity.mitoBillingAccess') }}</h3>
          <label class="flex items-start gap-2 text-sm"><input v-model="form.restrictPublicGroups" class="mt-1" type="checkbox" /><span>{{ t('identity.mitoRestrictPublic') }}</span></label>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('identity.mitoAllowedHint') }}</p>
          <div class="mito-identity-resource-list grid gap-2 sm:grid-cols-2">
            <label v-for="group in data.groups" :key="group.id" class="flex items-start gap-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-dark-700">
              <input v-model="form.allowedGroups" class="mt-1" type="checkbox" :value="group.id" />
              <span class="min-w-0"><span class="block break-words font-medium">{{ group.name }}</span><span class="mt-1 block text-xs text-gray-500">{{ group.platform }} · {{ t(group.exclusive ? 'identity.mitoExclusive' : 'identity.mitoPublic') }}{{ group.status !== 'active' ? ` · ${t('identity.disabled')}` : '' }}</span></span>
            </label>
          </div>
          <p v-if="!data.groups?.length" class="text-sm text-gray-500">{{ t('identity.mitoNoBillingGroups') }}</p>
        </div>
        <div v-if="form.role === 'observer'" class="space-y-3 border-t border-gray-200 pt-4 dark:border-dark-700">
          <h3 class="text-sm font-semibold">{{ t('identity.mitoObserverScope') }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('identity.mitoObserverHint') }}</p>
          <div class="mito-identity-resource-list grid gap-2 sm:grid-cols-2">
            <label v-for="group in data.groups" :key="group.id" class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-dark-700"><input v-model="form.observerGroupIds" type="checkbox" :value="group.id" /><span class="min-w-0 break-words">{{ group.name }}</span></label>
          </div>
        </div>
        <div class="grid gap-4 border-t border-gray-200 pt-4 dark:border-dark-700 sm:grid-cols-2">
          <label class="block text-sm">{{ t('identity.mitoConcurrency') }}<input v-model.number="form.concurrency" class="input mt-1" type="number" min="0" max="100000" required /></label>
          <label class="block text-sm">{{ t('identity.mitoRPM') }}<input v-model.number="form.rpmLimit" class="input mt-1" type="number" min="0" max="1000000" required /></label>
        </div>
        <label class="block text-sm">{{ t('identity.mitoChangeReason') }}<textarea v-model="reason" class="input mt-1" rows="2" minlength="3" maxlength="500" :required="!data.protected" :placeholder="t('identity.mitoChangeReasonHint')"></textarea></label>
      </fieldset>
      <div class="space-y-3 border-t border-gray-200 pt-4 dark:border-dark-700">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('identity.mitoPolicyHint') }}</p>
        <div class="flex flex-wrap gap-3 text-sm"><RouterLink class="text-primary-600 dark:text-primary-400" to="/admin/user-groups">{{ t('identity.manageMitoUserGroups') }}</RouterLink><RouterLink class="text-primary-600 dark:text-primary-400" to="/admin/groups">{{ t('identity.manageMitoBillingGroups') }}</RouterLink></div>
      </div>
      <p v-if="saved" role="status" class="text-sm text-green-700 dark:text-green-400">{{ t('identity.mitoPermissionsSaved') }}</p>
      <button v-if="!data.protected" class="btn btn-primary" :disabled="busy || !validReason">{{ t(busy ? 'common.saving' : 'identity.saveMitoPermissions') }}</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { identityAPI, identityErrorKey, type IdentityMitoAccount, type IdentityMitoPermissions } from '@/api/identity'
import { isStepUpCancelled, type StepUpController } from '@/composables/useStepUp'
const props = defineProps<{ id: string; stepUp: StepUpController }>()
const emit = defineEmits<{ changed: [] }>()
const { t } = useI18n()
const data = ref<IdentityMitoPermissions>()
const form = ref<IdentityMitoAccount>()
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const reason = ref('')
const saved = ref(false)
const linkId = ref<number>()
const linkEmail = ref('')
const validReason = computed(() => Array.from(reason.value.trim()).length >= 3)
async function load() {
  loading.value = true; error.value = ''; saved.value = false
  try {
    data.value = await identityAPI.mitoPermissions(props.id)
    const account = data.value.account
    form.value = account && { ...account, allowedGroups: [...account.allowedGroups], observerGroupIds: [...account.observerGroupIds] }
    reason.value = ''
    return true
  }
  catch (e) { error.value = t(identityErrorKey(e)); data.value = undefined; form.value = undefined; return false }
  finally { loading.value = false }
}
function roleChanged() { if (form.value && form.value.role !== 'observer') form.value.observerGroupIds = [] }
async function linkAccount() {
  const userId = linkId.value
  if (busy.value || !userId || !validReason.value || data.value?.protected || data.value?.linked) return
  const input = { userId, email: linkEmail.value.trim(), reason: reason.value.trim() }
  busy.value = true
  error.value = ''
  try {
    await props.stepUp.run(() => identityAPI.linkMitoAccount(props.id, input))
    await load()
    emit('changed')
  } catch (e) {
    if (!isStepUpCancelled(e)) error.value = t(identityErrorKey(e))
  } finally {
    busy.value = false
  }
}
async function save() {
  if (busy.value || !form.value || !validReason.value || data.value?.protected) return
  busy.value = true; error.value = ''; saved.value = false
  const { role, status, userGroupId, allowedGroups, observerGroupIds, restrictPublicGroups, concurrency, rpmLimit, revision } = form.value
  try {
    await props.stepUp.run(() => identityAPI.saveMitoPermissions(props.id, { role, status, userGroupId, allowedGroups, observerGroupIds, restrictPublicGroups, concurrency, rpmLimit, revision, reason: reason.value.trim() }))
    saved.value = await load(); emit('changed')
  } catch (e) { if (!isStepUpCancelled(e)) error.value = t(identityErrorKey(e)) }
  finally { busy.value = false }
}
onMounted(load)
</script>
