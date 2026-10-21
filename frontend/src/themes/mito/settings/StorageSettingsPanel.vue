<template>
  <div class="mito-storage-settings" data-testid="storage-settings-panel">
    <section class="card mito-storage-panel" aria-labelledby="s3-storage-title">
      <header class="mito-storage-heading">
        <span class="mito-storage-icon" aria-hidden="true"><Icon name="database" /></span>
        <div>
          <h3 id="s3-storage-title">{{ t('admin.backup.s3.connectionTitle') }}</h3>
          <p>{{ t('admin.backup.s3.scopeHint') }}</p>
        </div>
      </header>

      <fieldset class="mito-storage-group">
        <legend>{{ t('admin.backup.s3.credentialsTitle') }}</legend>
        <div class="mito-storage-grid">
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.endpoint') }}</span>
            <input v-model="s3.endpoint" class="input" placeholder="https://s3.example.com" />
          </label>
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.region') }}</span>
            <input v-model="s3.region" class="input" placeholder="auto" />
          </label>
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.accessKeyId') }}</span>
            <input v-model="s3.access_key_id" class="input" autocomplete="off" />
          </label>
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.secretAccessKey') }}</span>
            <input v-model="s3.secret_access_key" type="password" class="input" autocomplete="new-password" :placeholder="s3SecretConfigured ? t('admin.backup.s3.secretConfigured') : ''" />
          </label>
        </div>
        <label class="mito-storage-checkbox">
          <input v-model="s3.force_path_style" type="checkbox" />
          <span>{{ t('admin.backup.s3.forcePathStyle') }}</span>
        </label>
      </fieldset>

      <fieldset class="mito-storage-group">
        <legend>{{ t('admin.backup.s3.destinationTitle') }}</legend>
        <div class="mito-storage-grid">
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.bucket') }}</span>
            <input v-model="s3.bucket" class="input" />
          </label>
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.prefix') }}</span>
            <input v-model="s3.prefix" class="input" placeholder="backups/" />
          </label>
        </div>
      </fieldset>

      <footer class="mito-storage-actions">
        <button type="button" class="mito-storage-guide" @click="$emit('show-guide')">{{ t('admin.backup.s3.r2Guide') }}</button>
        <div>
          <button type="button" class="btn btn-secondary" :disabled="testingS3 || savingS3" @click="$emit('test-s3')">{{ testingS3 ? t('common.loading') : t('admin.backup.s3.testConnection') }}</button>
          <button type="button" class="btn btn-primary" :disabled="savingS3 || testingS3" @click="$emit('save-s3')">{{ savingS3 ? t('common.loading') : t('admin.backup.s3.saveConnection') }}</button>
        </div>
      </footer>
    </section>

    <section class="card mito-storage-panel" aria-labelledby="image-storage-title">
      <header class="mito-storage-heading">
        <span class="mito-storage-icon" aria-hidden="true"><Icon name="upload" /></span>
        <div>
          <h3 id="image-storage-title">{{ t('admin.backup.imageStorage.sharedTitle') }}</h3>
          <p>{{ t('admin.backup.imageStorage.sharedDescription') }}</p>
        </div>
      </header>

      <fieldset class="mito-storage-group">
        <legend>{{ t('admin.backup.imageStorage.sourceTitle') }}</legend>
        <label class="mito-storage-checkbox mito-storage-source">
          <input v-model="images.reuse_backup_s3" type="checkbox" />
          <span>
            <strong>{{ t('admin.backup.imageStorage.reuseConnection') }}</strong>
            <span>{{ t('admin.backup.imageStorage.reuseHint') }}</span>
          </span>
        </label>
        <div v-if="!images.reuse_backup_s3" class="mito-storage-grid">
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.endpoint') }}</span>
            <input v-model="images.endpoint" class="input" placeholder="https://s3.example.com" />
          </label>
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.region') }}</span>
            <input v-model="images.region" class="input" placeholder="auto" />
          </label>
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.accessKeyId') }}</span>
            <input v-model="images.access_key_id" class="input" autocomplete="off" />
          </label>
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.s3.secretAccessKey') }}</span>
            <input v-model="images.secret_access_key" type="password" class="input" autocomplete="new-password" :placeholder="imageSecretConfigured ? t('admin.backup.s3.secretConfigured') : ''" />
          </label>
          <label class="mito-storage-checkbox">
            <input v-model="images.force_path_style" type="checkbox" />
            <span>{{ t('admin.backup.s3.forcePathStyle') }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="mito-storage-group">
        <legend>{{ t('admin.backup.imageStorage.destinationTitle') }}</legend>
        <div class="mito-storage-grid">
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.imageStorage.bucket') }}</span>
            <input v-model="images.bucket" class="input" :placeholder="images.reuse_backup_s3 ? t('admin.backup.imageStorage.bucketInherited') : ''" />
          </label>
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.imageStorage.generatedPrefix') }}</span>
            <input v-model="images.prefix" class="input" placeholder="images/" />
          </label>
        </div>
      </fieldset>

      <fieldset class="mito-storage-group">
        <legend>{{ t('admin.backup.imageStorage.accessTitle') }}</legend>
        <div class="mito-storage-grid">
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.imageStorage.publicBaseUrl') }}</span>
            <input v-model="images.public_base_url" class="input" :placeholder="t('admin.backup.imageStorage.publicBaseUrlPlaceholder')" />
          </label>
          <label class="mito-storage-field">
            <span>{{ t('admin.backup.imageStorage.presignExpiryHours') }}</span>
            <input v-model.number="images.presign_expiry_hours" type="number" min="1" class="input" />
          </label>
        </div>
      </fieldset>

      <div class="mito-storage-feature" data-testid="async-image-feature">
        <div>
          <label for="async-image-enabled">{{ t('admin.backup.imageStorage.enabled') }}</label>
          <p id="async-image-hint">{{ t('admin.backup.imageStorage.asyncHint') }}</p>
        </div>
        <input id="async-image-enabled" v-model="images.enabled" type="checkbox" role="switch" :aria-checked="images.enabled" aria-describedby="async-image-hint" />
      </div>

      <footer class="mito-storage-actions">
        <p>{{ t('admin.backup.imageStorage.saveHint') }}</p>
        <div>
          <button type="button" class="btn btn-secondary" :disabled="testingImages || savingImages" @click="$emit('test-images')">{{ testingImages ? t('common.loading') : t('admin.backup.s3.testConnection') }}</button>
          <button type="button" class="btn btn-primary" :disabled="savingImages || testingImages" @click="$emit('save-images')">{{ savingImages ? t('common.loading') : t('admin.backup.imageStorage.saveSettings') }}</button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import type { BackupS3Config, ImageStorageConfig } from '@/api/admin/backup'

defineProps<{
  s3SecretConfigured: boolean
  imageSecretConfigured: boolean
  savingS3: boolean
  testingS3: boolean
  savingImages: boolean
  testingImages: boolean
}>()
defineEmits<{
  'show-guide': []
  'save-s3': []
  'test-s3': []
  'save-images': []
  'test-images': []
}>()
const s3 = defineModel<BackupS3Config>('s3', { required: true })
const images = defineModel<ImageStorageConfig>('images', { required: true })
const { t } = useI18n()
</script>
