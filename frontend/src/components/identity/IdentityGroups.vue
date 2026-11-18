<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3"><p class="text-sm text-gray-500 dark:text-gray-400">{{ t('identity.groupHint') }}</p><button class="btn btn-primary" @click="open()">{{ t('identity.createGroup') }}</button></div>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }} <button class="underline" @click="load">{{ t('common.tryAgain') }}</button></p>
    <DataTable :data="groups" :columns="columns" :loading="loading">
      <template #cell-managed="{ row }"><span class="text-sm">{{ t(row.managed ? 'identity.managed' : 'identity.readOnly') }}</span></template>
      <template #cell-actions="{ row }"><div class="flex flex-wrap gap-2"><button class="btn btn-secondary btn-sm" @click="members = row">{{ t('identity.groupMembers') }}</button><button class="btn btn-secondary btn-sm" :disabled="!row.managed" @click="open(row)">{{ t('common.edit') }}</button><button class="btn btn-secondary btn-sm" :disabled="!row.managed" @click="open(row, true)">{{ t('common.delete') }}</button></div></template>
      <template #empty><p class="py-8 text-sm">{{ t('identity.noGroups') }}</p></template>
    </DataTable>
  </div>
  <IdentityGroupMembers v-if="members" :key="members.id" :group="members" :step-up="stepUp" @close="members = undefined" />
  <BaseDialog v-if="show" :show="true" :title="t(removing ? 'identity.deleteGroup' : editing ? 'identity.editGroup' : 'identity.createGroup')" :show-close-button="!busy" :close-on-escape="!busy" @close="show = false">
    <form id="identity-group-form" class="space-y-4" @submit.prevent="save">
      <p v-if="removing" class="text-sm">{{ t('identity.deleteGroupHint', { name: editing?.name }) }}</p>
      <label class="block text-sm">{{ t(removing ? 'identity.confirmGroup' : 'identity.groupName') }}<input v-model="name" class="input mt-1" maxlength="100" required :disabled="busy" /></label>
      <p v-if="actionError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>
    </form>
    <template #footer><button class="btn btn-secondary" :disabled="busy" @click="show = false">{{ t('common.cancel') }}</button><button class="btn btn-primary" form="identity-group-form" :disabled="busy || (removing && name !== editing?.name)">{{ t('common.confirm') }}</button></template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IdentityGroupMembers from './IdentityGroupMembers.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import DataTable from '@/components/common/DataTable.vue'
import { identityAPI, identityErrorKey, type IdentityGroup } from '@/api/identity'
import { isStepUpCancelled, type StepUpController } from '@/composables/useStepUp'
const props = defineProps<{ stepUp: StepUpController }>()
const { t } = useI18n()
const groups = ref<IdentityGroup[]>([])
const members = ref<IdentityGroup>()
const loading = ref(true)
const busy = ref(false)
const show = ref(false)
const removing = ref(false)
const editing = ref<IdentityGroup>()
const name = ref('')
const error = ref('')
const actionError = ref('')
const columns = computed(() => [{ key: 'name', label: t('identity.groupName') }, { key: 'managed', label: t('identity.management') }, { key: 'actions', label: t('common.actions') }])
async function load() {
  loading.value = true; error.value = ''
  try { groups.value = await identityAPI.groups() }
  catch (e) { error.value = t(identityErrorKey(e)); groups.value = [] }
  finally { loading.value = false }
}
function open(group?: IdentityGroup, remove = false) { editing.value = group; removing.value = remove; name.value = remove ? '' : group?.name || ''; actionError.value = ''; show.value = true }
async function save() {
  if (busy.value) return
  busy.value = true; actionError.value = ''
  try {
    await props.stepUp.run(() => removing.value && editing.value
      ? identityAPI.deleteGroup(editing.value.id, name.value)
      : identityAPI.saveGroup(name.value, editing.value?.id))
    show.value = false; await load()
  } catch (e) { if (!isStepUpCancelled(e)) actionError.value = t(identityErrorKey(e)) }
  finally { busy.value = false }
}
onMounted(load)
</script>
