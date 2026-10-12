<template>
  <div class="mito-page-heading">
    <div class="mito-page-heading-copy">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="mito-page-heading-actions"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
import { useAdminSettingsStore } from '@/stores/adminSettings'
import { resolveRouteMetaKeys } from '@/router/title'
import { resolveSiteBillingMode } from '@/utils/siteBillingMode'

const route = useRoute()
const { t } = useI18n()
const app = useAppStore()
const auth = useAuthStore()
const adminSettings = useAdminSettingsStore()
const keys = computed(() => resolveRouteMetaKeys(route, { billingMode: resolveSiteBillingMode(app.cachedPublicSettings) }))
const title = computed(() => {
  if (route.name === 'CustomPage') {
    const id = route.params.id
    const item = app.cachedPublicSettings?.custom_menu_items?.find(item => item.id === id)
      ?? (auth.isAdmin ? adminSettings.customMenuItems.find(item => item.id === id) : undefined)
    if (item?.label) return item.label
  }
  return keys.value.titleKey ? t(keys.value.titleKey) : String(route.meta.title || '')
})
const description = computed(() => keys.value.descriptionKey ? t(keys.value.descriptionKey) : String(route.meta.description || ''))
</script>
