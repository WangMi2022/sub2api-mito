<template>
  <BaseDialog :show="true" :title="t(user ? 'identity.editUser' : 'identity.createUser')" :show-close-button="!busy" :close-on-escape="!busy" @close="$emit('close')">
    <form id="identity-user-form" class="space-y-4" @submit.prevent="save">
      <label class="block text-sm">{{ t('identity.username') }}
        <input v-model="form.username" class="input mt-1" required maxlength="120" autocomplete="off" :disabled="!!user || busy" />
      </label>
      <label class="block text-sm">{{ t('identity.email') }}
        <input v-model="form.email" class="input mt-1" required type="email" maxlength="254" autocomplete="off" :disabled="busy" />
      </label>
      <div class="grid grid-cols-2 gap-4">
        <label class="block text-sm">{{ t('identity.firstName') }}<input v-model="form.firstName" class="input mt-1" maxlength="100" :disabled="busy" /></label>
        <label class="block text-sm">{{ t('identity.lastName') }}<input v-model="form.lastName" class="input mt-1" maxlength="100" :disabled="busy" /></label>
      </div>
      <label v-if="!user" class="block text-sm">{{ t('identity.password') }}
        <input v-model="form.password" class="input mt-1" type="password" required minlength="8" maxlength="256" autocomplete="new-password" :disabled="busy" />
        <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">{{ t('identity.permanentPassword') }}</span>
      </label>
      <label class="flex items-center gap-2 text-sm"><input v-model="form.enabled" type="checkbox" :disabled="busy" />{{ t('identity.enabled') }}</label>
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.accountScope') }}</p>
      <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </form>
    <template #footer>
      <button class="btn btn-secondary" :disabled="busy" @click="$emit('close')">{{ t('common.cancel') }}</button>
      <button class="btn btn-primary" form="identity-user-form" :disabled="busy">{{ t(busy ? 'common.saving' : 'common.save') }}</button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { identityAPI, identityErrorKey, type IdentityUser, type IdentityUserInput } from '@/api/identity'

const props = defineProps<{ user?: IdentityUser }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const busy = ref(false)
const error = ref('')
const form = reactive<IdentityUserInput>({ username: props.user?.username || '', email: props.user?.email || '', firstName: props.user?.firstName || '', lastName: props.user?.lastName || '', enabled: props.user?.enabled ?? true, ...(!props.user ? { password: '' } : {}) })
async function save() {
  busy.value = true
  error.value = ''
  try { await identityAPI.saveUser({ ...form }, props.user?.id); form.password = undefined; emit('saved') }
  catch (e) { error.value = t(identityErrorKey(e)) }
  finally { busy.value = false }
}
</script>
