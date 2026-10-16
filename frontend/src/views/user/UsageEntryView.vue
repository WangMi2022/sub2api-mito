<template>
  <AdminUsageView v-if="authStore.isObserver" observer-mode />
  <MitoRequestLogsView v-else-if="isMitoTheme" />
  <UserUsageView v-else />
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { defineAsyncComponent } from 'vue'
import { isMitoTheme } from '@/themes/mito'
const MitoRequestLogsView = defineAsyncComponent(() => import('@/themes/mito/RequestLogsView.vue'))
const AdminUsageView = defineAsyncComponent(() => import('@/views/admin/UsageView.vue'))
const UserUsageView = defineAsyncComponent(() => import('@/views/user/UsageView.vue'))

const authStore = useAuthStore()
</script>
