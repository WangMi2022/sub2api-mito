<template>
  <header class="mito-auth-header">
    <router-link to="/" class="mito-auth-header-brand">
      <img :src="logo || '/logo.svg'" alt="" />
      <span>{{ name }}</span>
    </router-link>
    <div class="mito-auth-header-actions">
      <router-link
        v-if="isLogin && registrationEnabled"
        to="/register"
        class="mito-auth-header-primary"
      >
        {{ text('createAccount') }}
      </router-link>
      <router-link v-else-if="isRegister" to="/login" class="mito-auth-header-primary">
        {{ text('signIn') }}
      </router-link>
      <router-link to="/" class="mito-auth-header-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
        </svg>
        <span>{{ text('home') }}</span>
      </router-link>
      <LocaleSwitcher />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import { useMitoLabels } from './labels'

withDefaults(defineProps<{
  name: string
  logo: string
  registrationEnabled?: boolean
}>(), {
  registrationEnabled: false
})

const route = useRoute()
const text = useMitoLabels()
const isLogin = computed(() => route.path === '/login')
const isRegister = computed(() => route.path === '/register')
</script>
