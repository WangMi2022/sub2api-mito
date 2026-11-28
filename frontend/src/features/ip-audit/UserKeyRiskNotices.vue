<template>
  <section class="mito-key-risk min-w-0 rounded-lg border border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20" :aria-labelledby="titleId">
    <h2 :id="titleId">
      <button
        type="button"
        class="mito-key-risk-toggle flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-4 py-2 text-left text-sm"
        :aria-expanded="expanded"
        :aria-controls="detailsId"
        data-test="toggle-risk-notices"
        @click="expanded = !expanded"
      >
        <span class="mito-key-risk-heading min-w-0 truncate">
          <span class="mito-key-risk-badge" aria-hidden="true"><Icon name="shield" size="sm" /></span>
          <span class="font-medium">{{ t('ipAudit.keyRisk.userTitle') }}</span>
          <span v-if="error" class="mito-key-risk-count mito-key-risk-count--error ml-2 text-red-600">{{ t('ipAudit.keyRisk.error') }}</span>
          <span v-else class="mito-key-risk-count ml-2 text-gray-500 dark:text-gray-400">{{ t('ipAudit.keyRisk.noticeCount', { count: items.length }) }}</span>
        </span>
        <span class="mito-key-risk-chevron shrink-0 text-xs text-gray-600 dark:text-gray-300">{{ t(expanded ? 'ipAudit.keyRisk.collapseNotices' : 'ipAudit.keyRisk.expandNotices') }}<Icon name="chevronDown" size="sm" :class="['mito-key-risk-chevron-icon', expanded && 'mito-key-risk-chevron-icon--open']" aria-hidden="true" /></span>
      </button>
    </h2>
    <div
      v-show="expanded"
      :id="detailsId"
      data-test="risk-notices-details"
      class="mito-key-risk-details max-h-[min(24vh,16rem)] overflow-y-auto overscroll-contain px-4 pb-4"
    >
      <div class="mito-key-risk-toolbar flex justify-end">
        <button class="btn btn-secondary btn-sm" :disabled="busy" @click="load(0)">{{ t('common.refresh') }}</button>
      </div>
      <p class="mito-key-risk-hint mt-2 text-sm text-gray-600 dark:text-gray-300">{{ t('ipAudit.keyRisk.userHint') }}</p>
      <p v-if="error" role="alert" class="mt-2 text-sm text-red-600">{{ t('ipAudit.keyRisk.error') }}</p>
      <p v-if="message" role="status" class="mt-2 text-sm">{{ message }}</p>
      <p v-if="!busy && !error && !items.length" class="mt-2 text-sm">{{ t('ipAudit.keyRisk.noNotices') }}</p>
      <ul class="mito-key-risk-list mt-3 space-y-3">
        <li v-for="item in items" :key="`${item.event_id}-${item.generation}`" class="mito-key-risk-card rounded-lg border border-gray-200 bg-white p-3 dark:border-dark-600 dark:bg-dark-800" :class="item.acknowledged_at && 'mito-key-risk-card--ack'">
          <div class="mito-key-risk-card-head">
            <span class="mito-key-risk-rule" :class="item.acknowledged_at ? 'mito-key-risk-rule--ack' : 'mito-key-risk-rule--pending'" aria-hidden="true"><Icon :name="item.acknowledged_at ? 'checkCircle' : 'bell'" size="xs" /></span>
            <p class="font-medium">{{ t(`ipAudit.keyRisk.${item.rule}`) }} · #{{ item.event_id }}</p>
          </div>
          <div class="mito-key-risk-keys my-1 space-y-1 text-sm"><p class="text-xs text-gray-500">{{ t('ipAudit.keyRisk.keys') }}</p><div v-for="id in item.key_ids" :key="id"><RiskIdentity :id="id" :name="item.keys?.find(key => key.id === id)?.name" /></div><p v-if="!item.key_ids.length">—</p></div>
          <p class="mito-key-risk-meta text-sm text-gray-500"><Icon name="clock" size="xs" aria-hidden="true" />{{ new Date(item.last_seen).toLocaleString() }} · {{ t('ipAudit.keyRisk.attempts', { count: item.attempts, max: item.max_reminders }) }}</p>
          <p v-if="item.acknowledged_at" class="mito-key-risk-ack mt-2 text-sm" role="status"><Icon name="checkCircle" size="xs" aria-hidden="true" />{{ t('ipAudit.keyRisk.acknowledged') }} · {{ new Date(item.acknowledged_at).toLocaleString() }}</p>
          <p v-else-if="item.state !== 'pending'" class="mt-2 text-sm">{{ t(`ipAudit.keyRisk.${item.state}`) }}</p>
          <template v-else>
            <p v-if="item.attempts >= item.max_reminders" class="mito-key-risk-cap mt-2 text-sm">{{ t('ipAudit.keyRisk.limitReached') }}</p>
            <button class="btn btn-secondary btn-sm mt-2" :disabled="busy" @click="confirming = item">{{ t('ipAudit.keyRisk.acknowledge') }}</button>
          </template>
          <div v-if="confirming?.event_id === item.event_id" class="mito-key-risk-confirm mt-3 space-y-2 rounded border border-amber-300 p-3" role="group" :aria-label="t('ipAudit.keyRisk.acknowledge')">
            <p class="text-sm">{{ t('ipAudit.keyRisk.ackConfirm') }}</p>
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-primary btn-sm" :disabled="busy" data-test="confirm-risk" @click="acknowledge(item)">{{ t('ipAudit.keyRisk.ackSubmit') }}</button>
              <button class="btn btn-secondary btn-sm" :disabled="busy" @click="confirming = null">{{ t('common.cancel') }}</button>
            </div>
          </div>
        </li>
      </ul>
      <div v-if="before || items.length === 50" class="mt-3 flex gap-2">
        <button class="btn btn-secondary btn-sm" :disabled="busy || !before" @click="load(0)">{{ t('ipAudit.keyRisk.firstPage') }}</button>
        <button class="btn btn-secondary btn-sm" :disabled="busy || items.length < 50" @click="load(items[items.length - 1]!.event_id)">{{ t('ipAudit.next') }}</button>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
import RiskIdentity from './RiskIdentity.vue'
import { Icon } from '@/components/icons'
import { useI18n } from 'vue-i18n'
import { userKeyRiskApi, type UserKeyRiskNotice } from './keyRiskApi'
const { t } = useI18n()
const noticeId = useId()
const titleId = `key-risk-notices-title-${noticeId}`
const detailsId = `key-risk-notices-details-${noticeId}`
const items = ref<UserKeyRiskNotice[]>([])
const expanded = ref(false)
const busy = ref(false), error = ref(false), message = ref(''), before = ref(0)
const confirming = ref<UserKeyRiskNotice | null>(null)
async function load(cursor: number) {
  if (busy.value) return
  busy.value = true; error.value = false; message.value = ''; confirming.value = null
  try { items.value = (await userKeyRiskApi.list(cursor)).items; before.value = cursor }
  catch { error.value = true }
  finally { busy.value = false }
}
async function acknowledge(item: UserKeyRiskNotice) {
  if (busy.value) return
  busy.value = true; error.value = false; message.value = ''
  try {
    await userKeyRiskApi.acknowledge(item)
    confirming.value = null
    message.value = t('ipAudit.keyRisk.acknowledged')
    items.value = (await userKeyRiskApi.list(before.value)).items
  } catch { error.value = true }
  finally { busy.value = false }
}
onMounted(() => load(0))
</script>
