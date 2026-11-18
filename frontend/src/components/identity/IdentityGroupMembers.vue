<template>
  <BaseDialog :show="true" :title="t('identity.groupMembersTitle', { name: group.name })" width="wide" :show-close-button="!busy" :close-on-escape="!busy" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t(group.managed ? 'identity.membersHint' : 'identity.readOnlyMembersHint') }}</p>
      <div class="flex flex-wrap items-center gap-3">
        <button v-if="group.managed" class="btn btn-secondary" :disabled="busy" @click="switchMode">{{ t(adding ? 'identity.backToMembers' : 'identity.addMembers') }}</button>
        <label v-if="adding" class="flex items-center gap-2 text-sm"><input v-model="ungrouped" type="checkbox" :disabled="loading || busy" @change="search" />{{ t('identity.onlyUngrouped') }}</label>
        <button class="btn btn-secondary ml-auto" :disabled="loading || busy" @click="load">{{ t('common.refresh') }}</button>
      </div>
      <form v-if="adding" class="flex gap-2" @submit.prevent="search">
        <label class="min-w-0 flex-1"><span class="sr-only">{{ t('identity.search') }}</span><input v-model="query" class="input" type="search" maxlength="120" :placeholder="t('identity.search')" /></label>
        <button class="btn btn-secondary" :disabled="loading || busy">{{ t('common.search') }}</button>
      </form>
      <div v-if="group.managed && page.users.length" class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-dark-800">
        <label class="flex items-center gap-2"><input type="checkbox" :checked="allSelected" :disabled="busy || !selectable.length" @change="selectAll" />{{ t('identity.selectPage') }}</label>
        <button class="btn btn-primary btn-sm" :disabled="busy || !selected.size" @click="changeSelected">{{ t(adding ? 'identity.bulkAddMembers' : 'identity.bulkRemoveMembers', { count: selected.size }) }}</button>
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-if="saved" role="status" class="text-sm text-green-700 dark:text-green-400">{{ saved }}</p>
      <DataTable :data="page.users" :columns="columns" :loading="loading" row-key="id">
        <template #cell-selection="{ row }"><input v-if="group.managed" type="checkbox" :aria-label="t('identity.selectAccount', { name: row.username })" :checked="selected.has(row.id)" :disabled="busy || row.protected || added.has(row.id)" @change="toggle(row.id)" /></template>
        <template #cell-username="{ row }"><span class="break-words font-medium">{{ row.username }}</span><p v-if="row.protected" class="mt-1 text-xs text-gray-500">{{ t('identity.protected') }}</p></template>
        <template #cell-actions="{ row }"><button v-if="group.managed" class="btn btn-secondary btn-sm" :disabled="busy || row.protected || (adding && added.has(row.id))" @click="changeMember(row)">{{ t(adding ? (added.has(row.id) ? 'identity.memberAdded' : 'identity.addMember') : 'identity.removeMember') }}</button></template>
        <template #empty><p class="py-6 text-sm text-gray-500 dark:text-gray-400">{{ t(adding ? 'identity.noUsers' : 'identity.noMembers') }}</p></template>
      </DataTable>
      <div v-if="first > 0 || page.hasMore" class="flex justify-end gap-2"><button class="btn btn-secondary" :disabled="loading || busy || !first" @click="navigate(-50)">{{ t('pagination.previous') }}</button><button class="btn btn-secondary" :disabled="loading || busy || !page.hasMore" @click="navigate(50)">{{ t('pagination.next') }}</button></div>
    </div>
  </BaseDialog>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import DataTable from '@/components/common/DataTable.vue'
import { identityAPI, identityErrorKey, type IdentityGroup, type IdentityPage, type IdentityUser } from '@/api/identity'
import { isStepUpCancelled, type StepUpController } from '@/composables/useStepUp'
const props = defineProps<{ group: IdentityGroup; stepUp: StepUpController }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const adding = ref(false)
const ungrouped = ref(false)
const query = ref('')
const appliedQuery = ref('')
const first = ref(0)
const page = ref<IdentityPage>({ users: [], first: 0, hasMore: false })
const added = ref(new Set<string>())
const selected = ref(new Set<string>())
const loading = ref(true)
const busy = ref(false)
const saved = ref('')
const error = ref('')
let generation = 0
const columns = computed(() => [...(props.group.managed ? [{ key: 'selection', label: t('identity.selectMembers') }] : []), { key: 'username', label: t('identity.username') }, { key: 'email', label: t('identity.email') }, { key: 'actions', label: t('common.actions') }])
const selectable = computed(() => page.value.users.filter(user => !user.protected && !added.value.has(user.id)))
const allSelected = computed(() => selectable.value.length > 0 && selectable.value.every(user => selected.value.has(user.id)))
function toggle(id: string) { if (selected.value.has(id)) selected.value.delete(id); else selected.value.add(id) }
function selectAll() { selected.value = allSelected.value ? new Set() : new Set(selectable.value.map(user => user.id)) }
async function load() {
  const current = ++generation
  loading.value = true; error.value = ''; selected.value = new Set()
  try {
    const result = adding.value ? await identityAPI.users(appliedQuery.value, first.value, { ungrouped: ungrouped.value ? 'true' : undefined }) : await identityAPI.groupMembers(props.group.id, first.value)
    if (current === generation) page.value = result
  } catch (e) {
    if (current === generation) { error.value = t(identityErrorKey(e)); page.value = { users: [], first: first.value, hasMore: false } }
  } finally { if (current === generation) loading.value = false }
}
function switchMode() { adding.value = !adding.value; first.value = 0; saved.value = ''; added.value = new Set(); void load() }
function search() { appliedQuery.value = query.value.trim(); first.value = 0; saved.value = ''; void load() }
function navigate(delta: number) { first.value += delta; void load() }
async function change(ids: string[]) {
  if (busy.value) return
  busy.value = true; error.value = ''; saved.value = ''
  try {
    const result = await props.stepUp.run(() => identityAPI.bulkMembership(props.group.id, ids, adding.value))
    if (adding.value) result.changed.forEach(id => added.value.add(id))
    else { result.changed.forEach(id => added.value.delete(id)); if (result.changed.length === page.value.users.length && first.value) first.value -= 50 }
    await load()
    saved.value = t('identity.membersChanged', { count: result.changed.length })
    if (result.failed.length) { error.value = t('identity.membersPartiallyChanged', { count: result.failed.length }); selected.value = new Set(result.failed) }
  } catch (e) { if (!isStepUpCancelled(e)) error.value = t(identityErrorKey(e)) }
  finally { busy.value = false }
}
function changeMember(user: IdentityUser) { return change([user.id]) }
function changeSelected() { return change([...selected.value]) }
onMounted(load)
</script>
