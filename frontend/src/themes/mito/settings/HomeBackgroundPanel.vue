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
    <fieldset class="mito-storage-group mito-background-appearance" data-testid="home-background-appearance">
      <legend>{{ t('admin.settings.site.homeBackgroundAppearance') }}</legend>
      <p id="home-background-appearance-hint">{{ t('admin.settings.site.homeBackgroundAppearanceHint') }}</p>
      <div class="mito-background-controls">
        <label class="mito-background-range" for="home-background-blur">
          <span>{{ t('admin.settings.site.homeBackgroundBlur') }} <output for="home-background-blur">{{ blur }} px</output></span>
          <input id="home-background-blur" v-model.number="blur" type="range" min="0" max="20" step="1" aria-describedby="home-background-blur-hint" />
          <small id="home-background-blur-hint">{{ t('admin.settings.site.homeBackgroundBlurHint') }}</small>
        </label>
        <label class="mito-background-range" for="home-background-overlay">
          <span>{{ t('admin.settings.site.homeBackgroundOverlay') }} <output for="home-background-overlay">{{ overlay }}%</output></span>
          <input id="home-background-overlay" v-model.number="overlay" type="range" min="0" max="100" step="1" aria-describedby="home-background-overlay-hint" />
          <small id="home-background-overlay-hint">{{ t('admin.settings.site.homeBackgroundOverlayHint') }}</small>
        </label>
      </div>
      <button type="button" class="btn btn-secondary" @click="resetAppearance">{{ t('admin.settings.site.homeBackgroundReset') }}</button>
    </fieldset>
    <figure v-if="imageUrl" class="mito-background-preview">
      <div class="mito-background-preview-stage mito-home-background-visual" :style="homeBackgroundStyle(blur, overlay)" role="img" :aria-label="t('admin.settings.site.homeBackgroundPreview')">
        <div class="mito-home-background-image" :style="{ backgroundImage: `url(${imageUrl})` }"></div>
        <strong>{{ t('admin.settings.site.homeBackgroundPreviewText') }}</strong>
      </div>
      <figcaption>{{ t('admin.settings.site.homeBackgroundPreview') }}</figcaption>
    </figure>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { DEFAULT_BACKGROUND_BLUR, DEFAULT_BACKGROUND_OVERLAY, homeBackgroundStyle } from '../homeBackgroundAppearance'

defineProps<{
  options: { value: 'local' | 's3'; label: string }[]
  imageUrl: string
  uploading: boolean
  error: string
}>()
const storage = defineModel<'local' | 's3'>('storage', { required: true })
const blur = defineModel<number>('blur', { required: true })
const overlay = defineModel<number>('overlay', { required: true })
const { t } = useI18n()

function resetAppearance() {
  blur.value = DEFAULT_BACKGROUND_BLUR
  overlay.value = DEFAULT_BACKGROUND_OVERLAY
}
</script>
