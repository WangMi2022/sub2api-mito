<template>
  <div class="space-y-4">
    <div v-if="summary" class="mito-identity-group-summary grid gap-3 sm:grid-cols-3" aria-live="polite">
      <div v-for="key in ['accounts', 'grouped', 'ungrouped'] as const" :key="key" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800"><p class="text-xs text-gray-500 dark:text-gray-400">{{ t(`identity.groupSummary.${key}`) }}</p><p class="mt-2 text-2xl font-semibold" :class="key === 'ungrouped' && summary.ungrouped ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'">{{ summary[key] }}</p></div>
    </div>
    <TablePageLayout class="mito-identity-groups">
      <template #filters>
        <div class="flex flex-wrap items-start justify-between gap-3"><div class="max-w-3xl text-sm text-gray-500 dark:text-gray-400"><p>{{ t('identity.groupHint') }}</p><p class="mt-1">{{ t('identity.groupWorkflowHint') }}</p></div><div class="flex gap-2"><button class="btn btn-secondary" :disabled="loading" @click="load">{{ t('common.refresh') }}</button><button class="btn btn-primary" @click="open()">{{ t('identity.createGroup') }}</button></div></div>
        <p v-if="error" role="alert" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ error }} <button class="underline" @click="load">{{ t('common.tryAgain') }}</button></p>
      </template>
      <template #table>
        <DataTable :data="groups" :columns="columns" :loading="loading" row-key="id">
          <template #cell-name="{ row }"><div class="flex items-center gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"><Icon name="users" size="md" /></span><div class="min-w-0"><p class="break-words font-medium">{{ row.name }}</p><p class="mt-1 break-all text-xs text-gray-500">{{ row.path }}</p></div></div></template>
          <template #cell-memberCount="{ row }"><button class="text-sm font-medium text-primary-600 dark:text-primary-400" @click="members = row">{{ t('identity.memberCount', { count: row.memberCount }) }}</button></template>
          <template #cell-applications="{ row }"><div class="flex flex-wrap gap-1.5"><span v-for="app in row.applications.filter((app: IdentityAccess) => app.granted)" :key="app.clientId" class="badge badge-primary">{{ app.name }}</span><span v-if="!row.applications.some((app: IdentityAccess) => app.granted)" class="text-xs text-gray-500">{{ t('identity.noGroupAccess') }}</span></div></template>
          <template #cell-managed="{ row }"><span class="badge" :class="row.managed ? 'badge-success' : 'badge-gray'">{{ t(row.managed ? 'identity.managed' : 'identity.readOnly') }}</span></template>
          <template #cell-actions="{ row }"><div class="flex flex-wrap gap-2"><button class="btn btn-secondary btn-sm" @click="members = row">{{ t('identity.groupMembers') }}</button><button v-if="row.managed" class="btn btn-secondary btn-sm" @click="access = row">{{ t('identity.configureGroupAccess') }}</button><button v-if="row.canAdopt" class="btn btn-secondary btn-sm" @click="adopting = row">{{ t('identity.adoptGroup') }}</button><button class="btn btn-secondary btn-sm" :disabled="!row.managed" @click="open(row)">{{ t('common.edit') }}</button><button class="btn btn-secondary btn-sm" :disabled="!row.managed" @click="open(row, true)">{{ t('common.delete') }}</button></div></template>
          <template #empty><p class="py-8 text-sm">{{ t('identity.noGroups') }}</p></template>
        </DataTable>
      </template>
    </TablePageLayout>
  </div>
  <IdentityGroupMembers v-if="members" :key="members.id" :group="members" :step-up="stepUp" @close="members = undefined; load()" />
  <IdentityGroupAccess v-if="access" :key="access.id" :group="access" :step-up="stepUp" @close="access = undefined" @changed="load" />
  <BaseDialog v-if="adopting" :show="true" :title="t('identity.adoptGroup')" :show-close-button="!busy" :close-on-escape="!busy" @close="adopting = undefined; actionError = ''">
    <p class="text-sm">{{ t('identity.adoptGroupHint', { name: adopting.name }) }}</p><p v-if="actionError" role="alert" class="mt-3 text-sm text-red-600">{{ actionError }}</p>
    <template #footer><button class="btn btn-secondary" :disabled="busy" @click="adopting = undefined; actionError = ''">{{ t('common.cancel') }}</button><button class="btn btn-primary" :disabled="busy" @click="adopt">{{ t('common.confirm') }}</button></template>
  </BaseDialog>
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
import IdentityGroupAccess from './IdentityGroupAccess.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import DataTable from '@/components/common/DataTable.vue'
import TablePageLayout from '@/components/layout/TablePageLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import { identityAPI, identityErrorKey, type IdentityGroup, type IdentityAccess } from '@/api/identity'
import { isStepUpCancelled, type StepUpController } from '@/composables/useStepUp'
const props = defineProps<{ stepUp: StepUpController }>()
const { t } = useI18n()
const groups = ref<IdentityGroup[]>([])
const summary = ref<Awaited<ReturnType<typeof identityAPI.summary>>>()
const members = ref<IdentityGroup>()
const access = ref<IdentityGroup>()
const adopting = ref<IdentityGroup>()
const loading = ref(true)
const busy = ref(false)
const show = ref(false)
const removing = ref(false)
const editing = ref<IdentityGroup>()
const name = ref('')
const error = ref('')
const actionError = ref('')
const columns = computed(() => [{ key: 'name', label: t('identity.groupName') }, { key: 'memberCount', label: t('identity.groupMembersColumn') }, { key: 'applications', label: t('identity.groupApplicationColumn') }, { key: 'managed', label: t('identity.management') }, { key: 'actions', label: t('common.actions') }])
async function load() {
  loading.value = true; error.value = ''
  try { const result = await Promise.all([identityAPI.groups(), identityAPI.summary()]); groups.value = result[0]; summary.value = result[1] }
  catch (e) { error.value = t(identityErrorKey(e)); groups.value = []; summary.value = undefined }
  finally { loading.value = false }
}
function open(group?: IdentityGroup, remove = false) { editing.value = group; removing.value = remove; name.value = remove ? '' : group?.name || ''; actionError.value = ''; show.value = true }
async function adopt() {
  if (busy.value || !adopting.value) return
  busy.value = true; actionError.value = ''
  try { const id = adopting.value.id; await props.stepUp.run(() => identityAPI.adoptGroup(id)); adopting.value = undefined; await load() }
  catch (e) { if (!isStepUpCancelled(e)) actionError.value = t(identityErrorKey(e)) }
  finally { busy.value = false }
}
async function save() {
  if (busy.value) return
  busy.value = true; actionError.value = ''
  try {
    await props.stepUp.run(async () => {
      if (removing.value && editing.value) await identityAPI.deleteGroup(editing.value.id, name.value)
      else await identityAPI.saveGroup(name.value, editing.value?.id)
    })
    show.value = false; await load()
  } catch (e) { if (!isStepUpCancelled(e)) actionError.value = t(identityErrorKey(e)) }
  finally { busy.value = false }
}
onMounted(load)
</script>
