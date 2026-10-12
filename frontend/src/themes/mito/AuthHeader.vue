<template>
  <header class="mito-auth-header">
    <router-link to="/" class="mito-auth-header-brand">
      <img :src="logo || '/logo.svg'" alt="" />
      <span>{{ name }}</span>
    </router-link>
    <div class="mito-auth-header-actions">
      <router-link to="/" class="mito-header-control">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>
        {{ text('home') }}
      </router-link>
      <LocaleSwitcher />
    </div>
  </header>
</template>

<script setup lang="ts">
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import { useMitoLabels } from './labels'
defineProps<{ name: string, logo: string }>()
const text = useMitoLabels()
</script>
