<template>
  <aside class="mito-auth-story" aria-labelledby="mito-auth-story-title">
    <div class="mito-auth-story-glow" aria-hidden="true"></div>
    <div class="mito-auth-story-content">
      <div class="mito-auth-story-eyebrow">
        <span aria-hidden="true"></span>
        {{ text('accountCenter') }}
      </div>
      <h1 id="mito-auth-story-title">
        {{ text(isRegister ? 'registerStoryTitle' : 'loginStoryTitle') }}
      </h1>
      <p class="mito-auth-story-description">
        {{ text(isRegister ? 'registerStoryDescription' : 'loginStoryDescription') }}
      </p>

      <ul class="mito-auth-story-features">
        <li>
          <span class="mito-auth-story-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" />
              <circle cx="10" cy="7" r="3.5" />
              <path d="M17 8.5h4m-2-2v4M17.5 15.5l1.2 1.2 2.3-2.2" />
            </svg>
          </span>
          <span>
            <strong>{{ text('accountFeatureTitle') }}</strong>
            <small>{{ text('accountFeatureDescription') }}</small>
          </span>
        </li>
        <li>
          <span class="mito-auth-story-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <circle cx="8" cy="15" r="4" />
              <path d="m11 12 7-7m-2 0h4v4M14 9l2 2" />
            </svg>
          </span>
          <span>
            <strong>{{ text('keyFeatureTitle') }}</strong>
            <small>{{ text('keyFeatureDescription') }}</small>
          </span>
        </li>
        <li>
          <span class="mito-auth-story-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
              <path d="M3 21h19" />
            </svg>
          </span>
          <span>
            <strong>{{ text('usageFeatureTitle') }}</strong>
            <small>{{ text('usageFeatureDescription') }}</small>
          </span>
        </li>
      </ul>
    </div>

    <div class="mito-auth-story-footer">
      <span class="mito-auth-story-status" aria-hidden="true"></span>
      {{ text('serviceEntry') }}
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMitoLabels } from './labels'

const route = useRoute()
const text = useMitoLabels()
const isRegister = computed(() => route.path === '/register')
</script>
