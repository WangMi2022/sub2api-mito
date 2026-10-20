<template>
  <!-- Default Home Page -->
  <div
    class="mito-landing relative flex min-h-screen flex-col overflow-x-clip bg-gradient-to-br from-gray-50 via-primary-50/30 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950"
  >
    <!-- Ambient background: aurora washes + drifting particle glows (no grid, no connector lines) -->
    <LandingParticles />

    <!-- Header -->
    <header class="mito-landing-header" :data-scrolled="scrolled ? 'true' : 'false'">
      <nav
        class="mito-landing-nav-pill mx-auto flex items-center justify-between gap-3"
      >
        <!-- Logo -->
        <div class="flex min-w-0 items-center gap-3">
          <div class="mito-landing-nav-logo shrink-0 overflow-hidden rounded-xl shadow-md">
            <img :src="siteLogo || '/logo.svg'" alt="Logo" class="h-full w-full object-contain" />
          </div>
          <span class="hidden truncate text-sm font-semibold text-gray-800 sm:block dark:text-dark-100">
            {{ siteName }}
          </span>
        </div>

        <!-- Nav Actions -->
        <div class="flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher />

          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="md" />
          </a>

          <a
            href="#gateway-workbench"
            class="yuyu-nav-workbench"
          >
            <span class="yuyu-nav-workbench-dot"></span>
            {{ t('home.mito.workbench.enter') }}
          </a>

          <router-link
            v-if="showModelPlazaEntry"
            to="/model-plaza"
            class="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
            :title="t('nav.modelPlaza')"
          >
            <Icon name="grid" size="md" />
            <span class="hidden lg:inline">{{ t('nav.modelPlaza') }}</span>
          </router-link>

          <button
            @click="emit('toggleTheme')"
            class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          >
            <Icon v-if="isDark" name="sun" size="md" />
            <Icon v-else name="moon" size="md" />
          </button>

          <router-link
            v-if="isAuthenticated"
            :to="dashboardPath"
            class="inline-flex items-center gap-1.5 rounded-full bg-gray-900/90 py-1 pl-1 pr-2.5 transition-colors hover:bg-gray-800 dark:bg-white/90 dark:hover:bg-white"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-[10px] font-semibold text-white"
            >
              {{ userInitial }}
            </span>
            <span class="text-xs font-medium text-white dark:text-gray-900">{{ t('home.dashboard') }}</span>
            <svg
              class="h-3 w-3 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </router-link>
          <router-link
            v-else
            to="/login"
            class="inline-flex items-center rounded-full bg-gray-900/90 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white/90 dark:text-gray-900 dark:hover:bg-white"
          >
            {{ t('home.login') }}
          </router-link>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="relative z-10 flex-1 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <div class="mx-auto max-w-6xl">
        <!-- Hero Section - Left/Right Layout -->
        <div class="mito-hero mb-14 flex flex-col items-center justify-between gap-12 lg:flex-row lg:gap-16">
          <!-- Left: Text Content -->
          <div class="min-w-0 flex-1 text-center lg:text-left">
            <span class="mito-hero-badge mb-5">
              <span class="mito-hero-badge-dot"></span>
              {{ t('home.mito.heroBadge') }}
            </span>
            <h1 class="mito-hero-title mb-4 text-4xl font-bold md:text-5xl lg:text-6xl">
              {{ siteName }}
            </h1>
            <p class="mito-hero-sub mb-3 text-xl md:text-2xl">
              {{ t('home.mito.heroSubtitle') }}
            </p>
            <p class="mito-hero-desc mb-8 text-base" :class="{ 'lg:mx-0': true, 'mx-auto': true }">
              {{ t('home.mito.heroDescription') }}
            </p>

            <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <router-link
                :to="isAuthenticated ? dashboardPath : '/login'"
                class="mito-cta"
              >
                {{ isAuthenticated ? t('home.goToDashboard') : t('home.getStarted') }}
                <Icon name="arrowRight" size="md" :stroke-width="2" />
              </router-link>
              <router-link
                v-if="showModelPlazaEntry"
                to="/model-plaza"
                class="mito-cta-ghost"
              >
                <Icon name="grid" size="md" />
                {{ t('nav.modelPlaza') }}
              </router-link>
            </div>

            <!-- Trust strip -->
            <div class="mito-landing-stats mt-10 text-left">
              <div class="mito-landing-stat">
                <div class="mito-landing-stat-value">4</div>
                <div class="mito-landing-stat-label">{{ t('home.mito.stats.models') }}</div>
              </div>
              <div class="mito-landing-stat">
                <div class="mito-landing-stat-value">1</div>
                <div class="mito-landing-stat-label">{{ t('home.mito.stats.key') }}</div>
              </div>
              <div class="mito-landing-stat">
                <div class="mito-landing-stat-value">{{ t('home.mito.stats.routingValue') }}</div>
                <div class="mito-landing-stat-label">{{ t('home.mito.stats.failover') }}</div>
              </div>
              <div class="mito-landing-stat">
                <div class="mito-landing-stat-value">{{ t('home.mito.stats.billingValue') }}</div>
                <div class="mito-landing-stat-label">{{ t('home.mito.stats.billing') }}</div>
              </div>
            </div>
          </div>

          <!-- Right: Terminal Animation -->
          <div class="flex w-full min-w-0 flex-1 justify-center lg:justify-end">
            <div class="mito-terminal-glow terminal-container" :aria-label="t('home.mito.terminalLabel')">
              <div class="terminal-window">
                <!-- Window header -->
                <div class="terminal-header">
                  <div class="terminal-buttons">
                    <span class="btn-close"></span>
                    <span class="btn-minimize"></span>
                    <span class="btn-maximize"></span>
                  </div>
                  <span class="terminal-title">terminal</span>
                </div>
                <!-- Terminal content -->
                <div class="terminal-body">
                  <div class="code-line line-1">
                    <span class="code-prompt">$</span>
                    <span class="code-cmd">curl</span>
                    <span class="code-flag">-X POST</span>
                    <span class="code-url">/v1/chat/completions</span>
                  </div>
                  <div class="code-line line-2">
                    <span class="code-comment"># Routing to DeepSeek...</span>
                  </div>
                  <div class="code-line line-3">
                    <span class="code-success">200 OK</span>
                    <span class="code-response">{ "content": "Hello!" }</span>
                  </div>
                  <div class="code-line line-4">
                    <span class="code-prompt">$</span>
                    <span class="cursor"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature Tags - Centered -->
        <div class="mb-12 flex flex-wrap items-center justify-center gap-3 md:gap-4">
          <div
            class="inline-flex items-center gap-2.5 rounded-full border border-gray-200/50 bg-white/70 px-5 py-2.5 shadow-sm backdrop-blur-md dark:border-dark-700/50 dark:bg-dark-800/70"
          >
            <Icon name="swap" size="sm" class="text-primary-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{
              t('home.tags.subscriptionToApi')
            }}</span>
          </div>
          <div
            class="inline-flex items-center gap-2.5 rounded-full border border-gray-200/50 bg-white/70 px-5 py-2.5 shadow-sm backdrop-blur-md dark:border-dark-700/50 dark:bg-dark-800/70"
          >
            <Icon name="shield" size="sm" class="text-primary-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{
              t('home.tags.stickySession')
            }}</span>
          </div>
          <div
            class="inline-flex items-center gap-2.5 rounded-full border border-gray-200/50 bg-white/70 px-5 py-2.5 shadow-sm backdrop-blur-md dark:border-dark-700/50 dark:bg-dark-800/70"
          >
            <Icon name="chart" size="sm" class="text-primary-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{
              t('home.tags.realtimeBilling')
            }}</span>
          </div>
        </div>

        <!-- Core Features -->
        <CoreFeatures :is-authenticated="isAuthenticated" :dashboard-path="dashboardPath" />

        <!-- Three steps -->
        <div class="mb-16">
          <div class="mb-7 text-center">
            <h2 class="mito-section-title">{{ t('home.mito.steps.title') }}</h2>
            <p class="mito-section-sub text-sm sm:text-base">{{ t('home.mito.steps.subtitle') }}</p>
          </div>
          <div class="grid gap-5 md:grid-cols-3">
            <div class="mito-glass-card p-6">
              <div class="mito-step-index mb-3">01</div>
              <h3 class="mb-1.5 text-base font-semibold text-gray-900 dark:text-white">
                {{ t('home.mito.steps.connect.title') }}
              </h3>
              <p class="text-sm leading-relaxed text-gray-600 dark:text-dark-400">
                {{ t('home.mito.steps.connect.desc') }}
              </p>
            </div>
            <div class="mito-glass-card p-6">
              <div class="mito-step-index mb-3">02</div>
              <h3 class="mb-1.5 text-base font-semibold text-gray-900 dark:text-white">
                {{ t('home.mito.steps.call.title') }}
              </h3>
              <p class="text-sm leading-relaxed text-gray-600 dark:text-dark-400">
                {{ t('home.mito.steps.call.desc') }}
              </p>
            </div>
            <div class="mito-glass-card p-6">
              <div class="mito-step-index mb-3">03</div>
              <h3 class="mb-1.5 text-base font-semibold text-gray-900 dark:text-white">
                {{ t('home.mito.steps.monitor.title') }}
              </h3>
              <p class="text-sm leading-relaxed text-gray-600 dark:text-dark-400">
                {{ t('home.mito.steps.monitor.desc') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Gateway Workbench -->
        <GatewayWorkbench
          :is-authenticated="isAuthenticated"
          :dashboard-path="dashboardPath"
        />

        <!-- Supported Providers -->
        <div class="mb-7 text-center">
          <h2 class="mito-section-title">{{ t('home.providers.title') }}</h2>
          <p class="mito-section-sub text-sm">{{ t('home.providers.description') }}</p>
        </div>

        <div class="mb-16 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <div class="mito-provider">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900">
              <span class="text-xs font-bold text-white">K</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{ t('home.mito.providers.kimi') }}</span>
            <span class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              {{ t('home.providers.supported') }}
            </span>
          </div>
          <div class="mito-provider">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <span class="text-xs font-bold text-white">G</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{ t('home.mito.providers.glm') }}</span>
            <span class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              {{ t('home.providers.supported') }}
            </span>
          </div>
          <div class="mito-provider">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <span class="text-xs font-bold text-white">D</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{ t('home.mito.providers.deepseek') }}</span>
            <span class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              {{ t('home.providers.supported') }}
            </span>
          </div>
          <div class="mito-provider">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
              <span class="text-xs font-bold text-white">M</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{ t('home.mito.providers.minimax') }}</span>
            <span class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              {{ t('home.providers.supported') }}
            </span>
          </div>
          <div class="mito-provider opacity-70">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-500 to-gray-600">
              <span class="text-xs font-bold text-white">+</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{ t('home.providers.more') }}</span>
            <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-dark-700 dark:text-dark-400">
              {{ t('home.providers.soon') }}
            </span>
          </div>
        </div>

        <!-- Interactive API Sandbox -->
        <PlaygroundSandbox />

        <!-- Closing CTA band -->
        <div class="mito-cta-band flex flex-col items-center justify-between gap-5 px-6 py-8 text-center sm:px-10 md:flex-row md:text-left">
          <div>
            <h2 class="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">{{ t('home.mito.cta.title') }}</h2>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-dark-300">{{ t('home.mito.cta.description') }}</p>
          </div>
          <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="mito-cta shrink-0">
            {{ isAuthenticated ? t('home.goToDashboard') : t('home.mito.cta.button') }}
            <Icon name="arrowRight" size="md" :stroke-width="2" />
          </router-link>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-10 border-t border-gray-200/50 px-6 py-8 dark:border-dark-800/50">
      <div
        class="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 text-center sm:flex-row sm:text-left"
      >
        <p class="text-sm text-gray-500 dark:text-dark-400">
          &copy; {{ currentYear }} {{ siteName }}. {{ t('home.footer.allRightsReserved') }}
        </p>
        <div class="flex items-center gap-4">
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-dark-400 dark:hover:text-white"
          >
            {{ t('home.docs') }}
          </a>
          <a
            :href="githubUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-dark-400 dark:hover:text-white"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
import LandingParticles from './LandingParticles.vue'
import GatewayWorkbench from './GatewayWorkbench.vue'
import CoreFeatures from './CoreFeatures.vue'
import PlaygroundSandbox from './PlaygroundSandbox.vue'

const scrolled = ref(false)
let scrollFrame = 0

function readScroll() {
  scrollFrame = 0
  // Hysteresis: expand only after returning fully to the top, so the bar
  // does not flicker when the page settles a few pixels below the fold.
  const y = window.scrollY || document.documentElement.scrollTop || 0
  if (y > 24) scrolled.value = true
  else if (y < 6) scrolled.value = false
}

function onScroll() {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(readScroll)
}

onMounted(() => {
  readScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})

defineProps<{
  siteName: string
  siteLogo: string
  docUrl: string
  githubUrl: string
  isDark: boolean
  isAuthenticated: boolean
  dashboardPath: string
  userInitial: string
  currentYear: number
  showModelPlazaEntry: boolean
}>()

const emit = defineEmits<{ toggleTheme: [] }>()
const { t } = useI18n()
</script>
