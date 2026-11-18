<template>
  <BaseDialog :show="true" :title="t(user ? 'identity.editUser' : 'identity.createUser')" :z-index="55" :show-close-button="!busy" :close-on-escape="!busy" @close="close">
    <form id="identity-user-form" class="space-y-4" @submit.prevent="save">
      <label v-if="user || !realm?.emailAsUsername" class="block text-sm">{{ t('identity.username') }}
        <input v-model="form.username" class="input mt-1" required maxlength="120" autocomplete="off" :disabled="busy || (!!user && !realm?.usernameEditable)" />
      </label>
      <label class="block text-sm">{{ t('identity.email') }}
        <input v-model="form.email" class="input mt-1" required type="email" maxlength="254" autocomplete="off" :disabled="busy" />
      </label>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block text-sm">{{ t('identity.firstName') }}<input v-model="form.firstName" class="input mt-1" maxlength="100" :disabled="busy" /></label>
        <label class="block text-sm">{{ t('identity.lastName') }}<input v-model="form.lastName" class="input mt-1" maxlength="100" :disabled="busy" /></label>
      </div>
      <template v-if="!user">
        <label class="block text-sm">{{ t('identity.password') }}
          <input v-model="form.password" class="input mt-1" type="password" required minlength="8" maxlength="256" autocomplete="new-password" :disabled="busy" />
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.temporaryPassword" type="checkbox" :disabled="busy" />
          {{ t('identity.temporaryPassword') }}
        </label>
      </template>
      <label class="flex items-center gap-2 text-sm"><input v-model="form.enabled" type="checkbox" :disabled="busy" />{{ t('identity.enabled') }}</label>
      <p v-if="user?.emailVerified && user.email !== form.email" class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.emailChangeHint') }}</p>
      <p v-if="user?.enabled && !form.enabled" class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.disableHint') }}</p>
      <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </form>
    <template #footer>
      <button class="btn btn-secondary" :disabled="busy" @click="close">{{ t(changedWithoutLogout ? 'common.close' : 'common.cancel') }}</button>
      <button class="btn btn-primary" form="identity-user-form" :disabled="busy || changedWithoutLogout">{{ t(busy ? 'common.saving' : 'common.save') }}</button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { identityAPI, identityErrorKey, type IdentityRealm, type IdentityUser, type IdentityUserInput } from '@/api/identity'
import { isStepUpCancelled, type StepUpController } from '@/composables/useStepUp'

const props = defineProps<{ user?: IdentityUser; realm?: IdentityRealm; stepUp: StepUpController }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const busy = ref(false)
const error = ref('')
const changedWithoutLogout = ref(false)
const form = reactive<IdentityUserInput>({
  username: props.user?.username || '',
  email: props.user?.email || '',
  firstName: props.user?.firstName || '',
  lastName: props.user?.lastName || '',
  enabled: props.user?.enabled ?? true,
  ...(!props.user ? { password: '', temporaryPassword: true } : {})
})
function close() {
  if (changedWithoutLogout.value) emit('saved')
  else emit('close')
}
async function save() {
  if (busy.value || changedWithoutLogout.value) return
  busy.value = true
  error.value = ''
  try {
    await props.stepUp.run(() => identityAPI.saveUser({ ...form, email: form.email.trim() }, props.user?.id))
    emit('saved')
  } catch (e) {
    if (!isStepUpCancelled(e)) {
      const key = identityErrorKey(e)
      changedWithoutLogout.value = key === 'identity.errors.identity_changed_logout_failed'
      error.value = t(key)
    }
  }
  finally { busy.value = false }
}
</script>
