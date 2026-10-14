<template>
  <div ref="groupRef" class="mito-pelican-group" :data-testid="`pelican-showcase-group-${group.id}`">
    <!-- The whole header row is the disclosure control, so a group with many results starts folded away. -->
    <component
      :is="hasItems ? 'button' : 'div'"
      :type="hasItems ? 'button' : undefined"
      class="mito-pelican-group-header"
      :class="{ 'mito-pelican-group-header--static': !hasItems }"
      :aria-expanded="hasItems ? expanded : undefined"
      :aria-controls="hasItems && expanded ? bodyId : undefined"
      :title="hasItems ? label(expanded ? 'pelicanCollapseGroup' : 'pelicanExpandGroup', { group: group.name }) : undefined"
      :data-testid="hasItems ? 'pelican-showcase-group-toggle' : undefined"
      @click="hasItems ? emit('toggle') : undefined"
    >
      <span
        class="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl ring-1 ring-black/5 dark:ring-white/10"
        :class="platformBadgeLightClass(group.platform)"
      >
        <PlatformIcon :platform="group.platform as GroupPlatform" size="sm" />
      </span>
      <div class="min-w-0">
        <h2 class="truncate text-base font-semibold text-gray-900 dark:text-white">{{ group.name }}</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ platformLabel(group.platform) }}
          · {{ t('pelicanShowcase.itemCount', { count: group.items.length }) }}
          <template v-if="group.items.length">
            · {{ t('pelicanShowcase.latestAt', { time: formatRelativeTime(group.items[0].generated_at) }) }}
          </template>
        </p>
      </div>
      <span v-if="hasItems" class="mito-pelican-group-chevron" aria-hidden="true">
        <Icon name="chevronDown" size="sm" />
      </span>
    </component>

    <div
      v-if="!hasItems"
      class="mito-pelican-empty rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-dark-600 dark:text-gray-400"
      data-testid="pelican-showcase-empty"
    >
      {{ t('pelicanShowcase.groupEmpty') }}
    </div>

    <!-- Folded groups mount no cards, so their sandbox frames cost nothing until the reader opens one. -->
    <div v-else-if="expanded" :id="bodyId" class="mito-pelican-body" data-testid="pelican-showcase-body">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import PelicanShowcaseCard from '@/components/user/pelican/PelicanShowcaseCard.vue'
import type { PelicanBody } from '@/components/user/pelican/pelicanShowcaseFormat'
import type { PelicanShowcaseGroup, PelicanShowcaseItem } from '@/api/pelicanShowcase'
import type { GroupPlatform } from '@/types'
import { formatRelativeTime } from '@/utils/format'
import { platformBadgeLightClass, platformLabel } from '@/utils/platformColors'
import { useMitoLabels } from './labels'

const props = defineProps<{
  group: PelicanShowcaseGroup
  /** Lazily loaded artwork of every group, kept by the page so paging back never refetches. */
  bodies: Record<number, PelicanBody>
  /** Fold state lives in the page, so it survives filtering by group tab. */
  expanded: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'visible', id: number): void
  (e: 'open', group: PelicanShowcaseGroup, item: PelicanShowcaseItem): void
}>()

// Small pages keep the sandbox frames cheap on phones; 8 fills a four-column grid on desktop.
const PAGE_SIZES = [4, 8, 12] as const
const DEFAULT_PAGE_SIZE = 8
const STORAGE_KEY = 'mito-pelican-page-size'

const { t } = useI18n()
const label = useMitoLabels()
const groupRef = ref<HTMLElement | null>(null)
const bodyId = 'mito-pelican-body-' + useId()
const page = ref(1)
const pageSize = ref(readPageSize())

const hasItems = computed(() => props.group.items.length > 0)
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

function scrollToGroup() {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  const target = groupRef.value
  if (!target || typeof target.scrollIntoView !== 'function') return
  target.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
}

function goTo(next: number) {
  const target = Math.min(Math.max(next, 1), totalPages.value)
  if (target === page.value) return
  page.value = target
  scrollToGroup()
}

function setPageSize(size: number) {
  if (size === pageSize.value) return
  // Keep the artwork the reader is looking at in view when the page grows or shrinks.
  const firstIndex = (page.value - 1) * pageSize.value
  pageSize.value = size
  rememberPageSize(size)
  page.value = Math.min(Math.floor(firstIndex / size) + 1, totalPages.value)
  scrollToGroup()
}

// Taking one artwork down shrinks the group; an out-of-range page falls back to the last one.
watch(() => props.group.items.length, (length) => {
  const last = Math.max(1, Math.ceil(length / pageSize.value))
  if (page.value > last) page.value = last
})
</script>
