<template>
  <div ref="galleryRef" class="mito-pelican-gallery" :data-testid="`pelican-showcase-gallery-${group.id}`">
    <!-- Only the current page is mounted, so a group of 20 artworks never creates 20 sandbox frames at once. -->
    <div class="mito-pelican-grid" data-testid="pelican-showcase-grid">
      <PelicanShowcaseCard
        v-for="item in pageItems"
        :key="item.id"
        :item="item"
        :group-name="group.name"
        :body="bodies[item.id]"
        @visible="emit('visible', item.id)"
        @open="emit('open', group, item)"
      />
    </div>

    <nav
      v-if="totalPages > 1"
      class="mito-pelican-pager"
      :aria-label="label('pelicanGalleryLabel', { group: group.name })"
      data-testid="pelican-showcase-pager"
    >
      <p class="mito-pelican-pager-summary" data-testid="pelican-showcase-pager-summary" aria-live="polite">
        {{ label('pelicanPageSummary', { page, total: totalPages, count: group.items.length }) }}
      </p>

      <div class="mito-pelican-pager-pages" role="group" :aria-label="label('page')">
        <button
          type="button"
          class="mito-pelican-pager-step"
          :aria-label="t('pagination.previous')"
          :disabled="page <= 1"
          data-testid="pelican-showcase-page-prev"
          @click="goTo(page - 1)"
        >
          <Icon name="chevronLeft" size="sm" />
        </button>
        <template v-for="entry in pageEntries" :key="entry.key">
          <button
            v-if="entry.page"
            type="button"
            class="mito-pelican-pager-page"
            :class="{ 'is-current': page === entry.page }"
            :aria-label="label('goToPage', { page: entry.page })"
            :aria-current="page === entry.page ? 'page' : undefined"
            :data-testid="`pelican-showcase-page-${entry.page}`"
            @click="goTo(entry.page)"
          >
            {{ entry.page }}
          </button>
          <span v-else class="mito-pelican-pager-gap" aria-hidden="true">…</span>
        </template>
        <button
          type="button"
          class="mito-pelican-pager-step"
          :aria-label="t('pagination.next')"
          :disabled="page >= totalPages"
          data-testid="pelican-showcase-page-next"
          @click="goTo(page + 1)"
        >
          <Icon name="chevronRight" size="sm" />
        </button>
      </div>

      <div class="mito-pelican-per-page" role="group" :aria-label="label('pelicanPageSize')">
        <span>{{ label('pelicanPageSize') }}</span>
        <button
          v-for="size in PAGE_SIZES"
          :key="size"
          type="button"
          :class="{ 'is-current': pageSize === size }"
          :aria-pressed="pageSize === size"
          :data-testid="`pelican-showcase-page-size-${size}`"
          @click="setPageSize(size)"
        >
          {{ size }}
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import PelicanShowcaseCard from '@/components/user/pelican/PelicanShowcaseCard.vue'
import type { PelicanBody } from '@/components/user/pelican/pelicanShowcaseFormat'
import type { PelicanShowcaseGroup, PelicanShowcaseItem } from '@/api/pelicanShowcase'
import { useMitoLabels } from './labels'

const props = defineProps<{
  group: PelicanShowcaseGroup
  /** Lazily loaded artwork of every group, kept by the page so paging back never refetches. */
  bodies: Record<number, PelicanBody>
}>()

const emit = defineEmits<{
  (e: 'visible', id: number): void
  (e: 'open', group: PelicanShowcaseGroup, item: PelicanShowcaseItem): void
}>()

// Small pages keep the sandbox frames cheap on phones; 8 fills a four-column grid on desktop.
const PAGE_SIZES = [4, 8, 12] as const
const DEFAULT_PAGE_SIZE = 8
const STORAGE_KEY = 'mito-pelican-page-size'

const { t } = useI18n()
const label = useMitoLabels()
const galleryRef = ref<HTMLElement | null>(null)
const page = ref(1)
const pageSize = ref(readPageSize())

const totalPages = computed(() => Math.max(1, Math.ceil(props.group.items.length / pageSize.value)))
const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return props.group.items.slice(start, start + pageSize.value)
})
const pageEntries = computed(() => {
  const total = totalPages.value
  const values = new Set([1, total])
  const start = Math.max(1, Math.min(page.value - 2, total - 4))
  for (let index = start; index <= Math.min(total, start + 4); index++) values.add(index)
  const entries: { key: string; page?: number }[] = []
  let previous = 0
  for (const value of [...values].sort((a, b) => a - b)) {
    if (value - previous > 1) entries.push({ key: `gap-${value}` })
    entries.push({ key: String(value), page: value })
    previous = value
  }
  return entries
})

function readPageSize(): number {
  if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY))
    if ((PAGE_SIZES as readonly number[]).includes(stored)) return stored
  } catch (error) {
    console.warn('Failed to read the pelican page size:', error)
  }
  return DEFAULT_PAGE_SIZE
}

function rememberPageSize(size: number) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(size))
  } catch (error) {
    console.warn('Failed to persist the pelican page size:', error)
  }
}

function scrollToGallery() {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  const target = galleryRef.value
  if (!target || typeof target.scrollIntoView !== 'function') return
  target.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
}

function goTo(next: number) {
  const target = Math.min(Math.max(next, 1), totalPages.value)
  if (target === page.value) return
  page.value = target
  scrollToGallery()
}

function setPageSize(size: number) {
  if (size === pageSize.value) return
  // Keep the artwork the reader is looking at in view when the page grows or shrinks.
  const firstIndex = (page.value - 1) * pageSize.value
  pageSize.value = size
  rememberPageSize(size)
  page.value = Math.min(Math.floor(firstIndex / size) + 1, totalPages.value)
  scrollToGallery()
}

// Taking one artwork down shrinks the group; an out-of-range page falls back to the last one.
watch(() => props.group.items.length, (length) => {
  const last = Math.max(1, Math.ceil(length / pageSize.value))
  if (page.value > last) page.value = last
})
</script>
