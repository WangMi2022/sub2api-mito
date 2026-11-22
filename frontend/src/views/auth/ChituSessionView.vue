<template>
  <AuthLayout>
    <div class="space-y-6 text-center">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('identity.chituSessionTitle') }}
      </h2>
      <p role="status" class="text-sm text-gray-500 dark:text-dark-400">
        {{ failed ? t('identity.chituSessionFailed') : t('identity.chituSessionLoading') }}
      </p>
      <div v-if="!failed" aria-hidden="true" class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      <button v-else type="button" class="btn btn-primary" @click="continueLogin">
        {{ t('identity.chituSessionRetry') }}
      </button>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { authorizeChituSession } from '@/api/auth'
import { useAppStore } from '@/stores/app'
import { buildChituSessionStartURL } from '@/utils/chituSSO'

const { t } = useI18n()
const route = useRoute()
const app = useAppStore()
const failed = ref(false)

async function continueLogin() {
  failed.value = false
  try {
    const settings = await app.fetchPublicSettings()
    const origin = settings?.chitu_sso_origin || ''
    const state = route.query.state
    const challenge = route.query.code_challenge
    if (typeof state === 'string' && typeof challenge === 'string') {
      if (!/^[a-f0-9]{64}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
        throw new Error('Invalid continuation request')
      }
      // apiClient coordinates normal local refresh and retries on expired JWTs.
      const { authorize_url: destination } = await authorizeChituSession(state, challenge)
      const url = new URL(destination)
      if (url.origin !== origin || url.pathname !== '/api/v1/auth/mito/callback') {
        throw new Error('Invalid continuation response')
      }
      window.location.replace(url.href)
    } else if (!state && !challenge && typeof route.query.target === 'string') {
      window.location.replace(buildChituSessionStartURL(route.query.target, origin, window.location.origin))
    } else {
      throw new Error('Missing continuation request')
    }
  } catch {
    failed.value = true
  }
}

onMounted(continueLogin)
</script>
