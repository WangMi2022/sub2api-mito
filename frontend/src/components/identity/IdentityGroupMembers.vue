<template>
  <BaseDialog :show="true" :title="t('identity.groupMembersTitle', { name: group.name })" width="wide" :show-close-button="!busy" :close-on-escape="!busy" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t(group.managed ? 'identity.membersHint' : 'identity.readOnlyMembersHint') }}</p>
      <div class="flex flex-wrap items-center gap-3">
        <button v-if="group.managed" class="btn btn-secondary" :disabled="busy" @click="switchMode">{{ t(adding ? 'identity.backToMembers' : 'identity.addMembers') }}</button>
        <button class="btn btn-secondary ml-auto" :disabled="loading || busy" @click="load">{{ t('common.refresh') }}</button>
      </div>
      <form v-if="adding" class="flex gap-2" @submit.prevent="search">
        <label class="min-w-0 flex-1"><span class="sr-only">{{ t('identity.search') }}</span><input v-model="query" class="input" type="search" maxlength="120" :placeholder="t('identity.search')" /></label>
        <button class="btn btn-secondary" :disabled="loading || busy">{{ t('common.search') }}</button>
      </form>
      <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-if="saved" role="status" class="text-sm">{{ t('identity.saved') }}</p>
      <DataTable :data="page.users" :columns="columns" :loading="loading">
        <template #cell-username="{ row }"><span class="font-medium">{{ row.username }}</span><p v-if="row.protected" class="mt-1 text-xs text-gray-500">{{ t('identity.protected') }}</p></template>
        <template #cell-actions="{ row }"><button v-if="group.managed" class="btn btn-secondary btn-sm" :disabled="busy || row.protected || (adding && added.has(row.id))" @click="changeMember(row)">{{ t(adding ? (added.has(row.id) ? 'identity.memberAdded' : 'identity.addMember') : 'identity.removeMember') }}</button></template>
        <template #empty><p class="py-8 text-sm">{{ t(error ? 'identity.loadFailed' : adding ? 'identity.noUsers' : 'identity.noMembers') }}</p></template>
      </DataTable>
      <div class="flex items-center justify-between gap-2 text-sm"><span class="text-gray-500">{{ t('identity.shownUsers', { count: page.users.length }) }}</span><div v-if="first || page.hasMore" class="flex gap-2"><button class="btn btn-secondary btn-sm" :disabled="loading || busy || !first" @click="navigate(-50)">{{ t('common.back') }}</button><button class="btn btn-secondary btn-sm" :disabled="loading || busy || !page.hasMore" @click="navigate(50)">{{ t('common.next') }}</button></div></div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import DataTable from '@/components/common/DataTable.vue'
import { identityAPI, identityErrorKey, type IdentityGroup, type IdentityPage, type IdentityUser } from '@/api/identity'

const props = defineProps<{ group: IdentityGroup }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const adding = ref(false)
const query = ref('')
const appliedQuery = ref('')
const first = ref(0)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const saved = ref(false)
const added = ref(new Set<string>())
const page = ref<IdentityPage>({ users: [], first: 0, hasMore: false })
let generation = 0
const columns = computed(() => [{ key: 'username', label: t('identity.username') }, { key: 'email', label: t('identity.email') }, { key: 'actions', label: t('common.actions') }])

async function load() {
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    const result = adding.value ? await identityAPI.users(appliedQuery.value, first.value) : await identityAPI.groupMembers(props.group.id, first.value)
    if (current === generation) page.value = result
  } catch (e) {
    if (current === generation) { error.value = t(identityErrorKey(e)); page.value = { users: [], first: first.value, hasMore: false } }
  } finally { if (current === generation) loading.value = false }
}

function switchMode() { adding.value = !adding.value; first.value = 0; saved.value = false; void load() }
function search() { appliedQuery.value = query.value.trim(); first.value = 0; void load() }
function navigate(delta: number) { first.value += delta; void load() }

async function changeMember(user: IdentityUser) {
  busy.value = true
  error.value = ''
  saved.value = false
  try {
    await identityAPI.membership(user.id, props.group.id, adding.value)
    if (adding.value) added.value.add(user.id)
    else { added.value.delete(user.id); if (page.value.users.length === 1 && first.value) first.value -= 50; await load() }
    saved.value = true
  } catch (e) { error.value = t(identityErrorKey(e)) }
  finally { busy.value = false }
}

onMounted(load)
</script>
