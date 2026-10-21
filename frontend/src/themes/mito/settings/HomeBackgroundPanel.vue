<template>
  <section class="mito-storage-panel mito-home-background" aria-labelledby="home-background-title" data-testid="home-background-panel">
    <header class="mito-storage-heading">
      <span class="mito-storage-icon" aria-hidden="true"><Icon name="upload" /></span>
      <div>
        <h3 id="home-background-title">{{ t('admin.settings.site.homeBackground') }}</h3>
        <p>{{ t('admin.settings.site.homeBackgroundDescription') }}</p>
      </div>
    </header>

    <fieldset class="mito-storage-group">
      <legend>{{ t('admin.settings.site.homeBackgroundStorage') }}</legend>
      <div class="mito-storage-choices">
        <label v-for="option in options" :key="option.value" class="mito-storage-choice" :class="{ 'is-selected': storage === option.value }">
          <input v-model="storage" type="radio" name="home-background-storage" :value="option.value" :disabled="uploading" />
          <span>
            <strong>{{ option.label }}</strong>
            <span>{{ option.value === 's3' ? t('admin.settings.site.homeBackgroundS3Hint') : t('admin.settings.site.homeBackgroundLocalHint') }}</span>
          </span>
        </label>
      </div>
    </fieldset>

    <div class="mito-background-upload">
      <div class="mito-background-upload-copy">
        <strong>{{ t('admin.settings.site.homeBackgroundFile') }}</strong>
        <p>{{ t('admin.settings.site.homeBackgroundFileHint') }}</p>
      </div>
      <div class="mito-storage-upload-actions"><slot /></div>
    </div>
    <p v-if="error" class="mito-storage-error" role="alert">{{ error }}</p>
    <figure v-if="imageUrl" class="mito-background-preview">
      <img :src="imageUrl" :alt="t('admin.settings.site.homeBackgroundPreview')" />
      <figcaption>{{ t('admin.settings.site.homeBackgroundPreview') }}</figcaption>
    </figure>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

defineProps<{
  options: { value: 'local' | 's3'; label: string }[]
  imageUrl: string
  uploading: boolean
  error: string
}>()
const storage = defineModel<'local' | 's3'>('storage', { required: true })
const { t } = useI18n()
</script>
