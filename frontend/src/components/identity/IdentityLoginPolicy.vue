<template>
  <section class="max-w-3xl space-y-6" :aria-label="t('identity.loginPolicy')">
    <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }} <button class="underline" @click="load">{{ t('common.tryAgain') }}</button></p>
    <p v-if="loading" role="status" class="text-sm text-gray-500">{{ t('common.loading') }}</p>
    <template v-if="policy">
      <div class="flex items-start justify-between gap-6 border-b border-gray-200 pb-6 dark:border-dark-700">
        <div class="space-y-2">
          <h2 id="identity-login-policy-label" class="font-medium">{{ t('identity.oidcOnly') }}</h2>
          <p id="identity-login-policy-hint" class="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{{ t('identity.oidcOnlyHint') }}</p>
          <p class="text-sm font-medium">{{ t(policy.oidc_only ? 'identity.unifiedOnlyActive' : 'identity.multipleLoginActive') }}</p>
        </div>
        <Toggle :model-value="policy.oidc_only" :disabled="busy || loading" aria-labelledby="identity-login-policy-label" aria-describedby="identity-login-policy-hint" @update:model-value="requestChange" />
      </div>
      <div v-if="!policy.unified_session" class="space-y-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.verifyUnifiedHint') }}</p>
        <button class="btn btn-secondary" @click="verifyUnified">{{ t('identity.verifyUnified') }}</button>
      </div>
      <div class="space-y-2">
        <h3 class="text-sm font-medium">{{ t('identity.dataContinuity') }}</h3>
        <p class="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{{ t('identity.dataContinuityHint') }}</p>
      </div>
      <p v-if="saved" role="status" class="text-sm">{{ t('identity.saved') }}</p>
    </template>
    <BaseDialog :show="confirmation !== null" :title="t('identity.loginPolicy')" :show-close-button="!busy" :close-on-escape="!busy" @close="confirmation = null">
      <p class="text-sm leading-relaxed">{{ t(confirmation ? 'identity.enablePolicyConfirm' : 'identity.disablePolicyConfirm') }}</p>
      <p v-if="actionError" role="alert" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>
      <template #footer>
        <button class="btn btn-secondary" :disabled="busy" @click="confirmation = null">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="busy" @click="save">{{ t('common.confirm') }}</button>
      </template>
    </BaseDialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Toggle from '@/components/common/Toggle.vue'
import { identityAPI, identityErrorKey, type IdentityLoginPolicy } from '@/api/identity'
import { buildOAuthLoginStartURL } from '@/api/auth'
import { useAppStore } from '@/stores/app'
import { markIdentityLoginAttempt } from '@/utils/identityLogin'
import { isStepUpCancelled, type StepUpController } from '@/composables/useStepUp'

const props = defineProps<{ stepUp: StepUpController }>()
const { t } = useI18n()
const app = useAppStore()
const policy = ref<IdentityLoginPolicy>()
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const actionError = ref('')
const saved = ref(false)
const confirmation = ref<boolean | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try { policy.value = await identityAPI.loginPolicy() }
  catch (e) { error.value = t(identityErrorKey(e)) }
  finally { loading.value = false }
}

function requestChange(enabled: boolean) {
  saved.value = false
  if (enabled && !policy.value?.unified_session) {
    error.value = t('identity.verifyUnifiedHint')
    return
  }
  actionError.value = ''
  confirmation.value = enabled
}

function verifyUnified() {
  markIdentityLoginAttempt()
  window.location.assign(buildOAuthLoginStartURL({ provider: 'oidc', params: { redirect: '/identity?tab=loginPolicy' } }))
}

async function save() {
  const enabled = confirmation.value
  if (enabled === null || busy.value) return
  busy.value = true
  actionError.value = ''
  try {
    policy.value = await props.stepUp.run(() => identityAPI.setLoginPolicy(enabled))
    confirmation.value = null
    saved.value = true
    await app.fetchPublicSettings(true)
  } catch (e) { if (!isStepUpCancelled(e)) actionError.value = t(identityErrorKey(e)) }
  finally { busy.value = false }
}

onMounted(load)
</script>
