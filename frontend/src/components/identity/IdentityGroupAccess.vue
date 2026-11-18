<template>
  <BaseDialog :show="true" :title="t('identity.groupAccessTitle', { name: group.name })" :show-close-button="!busy" :close-on-escape="!busy" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.groupAccessHint') }}</p>
      <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-if="saved" role="status" class="text-sm text-green-700 dark:text-green-400">{{ t('identity.saved') }}</p>
      <div v-for="app in applications" :key="app.clientId" class="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-dark-700">
        <div class="min-w-0"><p class="break-words text-sm font-semibold">{{ app.name }}</p><p class="mt-1 text-xs text-gray-500">{{ t(app.granted ? 'identity.groupAccessGranted' : 'identity.accessDenied') }}</p></div>
        <button class="btn btn-secondary btn-sm" :disabled="busy || !group.managed" @click="change(app)">{{ t(app.granted ? 'identity.revokeAccess' : 'identity.grantAccess') }}</button>
      </div>
    </div>
  </BaseDialog>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { identityAPI, identityErrorKey, type IdentityGroup, type IdentityAccess } from '@/api/identity'
import { isStepUpCancelled, type StepUpController } from '@/composables/useStepUp'
const props = defineProps<{ group: IdentityGroup; stepUp: StepUpController }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const { t } = useI18n()
const applications = ref(props.group.applications.map(app => ({ ...app })))
const busy = ref(false)
const error = ref('')
const saved = ref(false)
async function change(app: IdentityAccess) {
  if (busy.value) return
  busy.value = true; error.value = ''; saved.value = false
  try {
    await props.stepUp.run(() => identityAPI.groupAccess(props.group.id, app.clientId, !app.granted))
    const groups = await identityAPI.groups()
    const latest = groups.find(group => group.id === props.group.id)
    if (latest) applications.value = latest.applications
    saved.value = true; emit('changed')
  } catch (e) { if (!isStepUpCancelled(e)) { error.value = t(identityErrorKey(e)); emit('changed') } }
  finally { busy.value = false }
}
</script>
