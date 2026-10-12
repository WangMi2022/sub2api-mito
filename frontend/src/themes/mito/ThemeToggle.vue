<template>
  <button class="mito-header-control" type="button" :aria-label="label" :title="label" @click="toggle">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <path v-if="!dark" d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />
      <template v-else>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </template>
    </svg>
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMitoLabels } from './labels'

const text = useMitoLabels()
const dark = ref(document.documentElement.classList.contains('dark'))
const label = computed(() => text(dark.value ? 'light' : 'dark'))
const observer = new MutationObserver(() => {
  dark.value = document.documentElement.classList.contains('dark')
})
onMounted(() => observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }))
onBeforeUnmount(() => observer.disconnect())

function toggle() {
  const next = !dark.value
  document.documentElement.classList.toggle('dark', next)
  dark.value = next
  try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch { /* Storage can be unavailable. */ }
}
</script>
