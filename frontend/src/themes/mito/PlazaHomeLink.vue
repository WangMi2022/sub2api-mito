<template>
  <RouterLink to="/home" class="mito-plaza-home-link">
    <Icon name="arrowLeft" size="sm" aria-hidden="true" />
    <span>{{ t('modelPlaza.nav.home') }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
</script>
