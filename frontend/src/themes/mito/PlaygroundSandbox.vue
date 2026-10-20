<template>
  <section id="playground" ref="root" class="mito-playground yuyu-reveal">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <header class="mito-playground-heading">
        <span class="mito-playground-eyebrow">{{ t('home.mito.playground.eyebrow') }}</span>
        <h2 class="mito-playground-title">{{ t('home.mito.playground.title') }}</h2>
        <p class="mito-playground-subtitle">{{ t('home.mito.playground.subtitle') }}</p>
      </header>

      <div v-if="loading" class="mito-playground-status" role="status">{{ t('common.loading') }}</div>
      <div v-else-if="!models.length" class="mito-playground-status" role="status">
        {{ t('home.mito.playground.empty') }}
      </div>

      <div v-else class="mito-playground-grid">
        <!-- Control panel -->
        <div class="mito-playground-panel">
          <label class="mito-field">
            <span class="mito-field-label">{{ t('home.mito.playground.endpointLabel') }}</span>
            <span class="mito-select" :class="{ 'is-open': openSelect === 'endpoint' }">
              <button
                type="button"
                class="mito-select-trigger"
                :aria-expanded="openSelect === 'endpoint'"
                aria-haspopup="listbox"
                :disabled="running"
                @click="toggle('endpoint')"
                @keydown.esc="openSelect = null"
              >
                <span class="mito-select-verb">{{ activeEndpoint.method }}</span>
                <span class="mito-select-value">{{ activeEndpoint.value }}</span>
                <Icon name="chevronDown" size="sm" />
              </button>
              <ul v-if="openSelect === 'endpoint'" class="mito-select-menu" role="listbox">
                <li v-for="item in endpoints" :key="item.value">
                  <button
                    type="button"
                    class="mito-select-option"
                    role="option"
                    :aria-selected="item.value === endpoint"
                    @click="chooseEndpoint(item.value)"
                  >
                    <span class="mito-select-verb">{{ item.method }}</span>
                    <span class="mito-select-value">{{ item.value }}</span>
                  </button>
                </li>
              </ul>
            </span>
          </label>

          <label class="mito-field">
            <span class="mito-field-label">{{ t('home.mito.playground.modelLabel') }}</span>
            <span class="mito-select" :class="{ 'is-open': openSelect === 'model' }">
              <button
                type="button"
                class="mito-select-trigger is-model"
                :aria-expanded="openSelect === 'model'"
                aria-haspopup="listbox"
                :disabled="running"
                @click="toggle('model')"
                @keydown.esc="openSelect = null"
              >
                <ModelIcon :model="activeModel.icon" size="26px" />
                <span class="mito-select-copy">
                  <strong>{{ activeModel.name }}</strong>
                  <small>{{ activeModel.provider }} · {{ activeModel.rateLabel }}</small>
                </span>
                <Icon name="chevronDown" size="sm" />
              </button>
              <ul v-if="openSelect === 'model'" class="mito-select-menu is-wide" role="listbox">
                <li v-for="item in models" :key="item.key">
                  <button
                    type="button"
                    class="mito-select-option is-model"
                    role="option"
                    :aria-selected="item.key === activeModel.key"
                    @click="chooseModel(item.key)"
                  >
                    <ModelIcon :model="item.icon" size="24px" />
                    <span class="mito-select-copy">
                      <strong>{{ item.name }}</strong>
                      <small>{{ item.provider }} · {{ item.rateLabel }}</small>
                    </span>
                  </button>
                </li>
              </ul>
            </span>
          </label>

          <label class="mito-slider-field">
            <span class="mito-field-label">
              {{ t('home.mito.playground.tokensInput') }}
              <b>{{ inputTokens.toLocaleString() }}</b>
            </span>
            <input v-model.number="inputTokens" type="range" min="100" max="8000" step="100" :disabled="running" />
          </label>

          <label class="mito-slider-field">
            <span class="mito-field-label">
              {{ t('home.mito.playground.tokensOutput') }}
              <b>{{ outputTokens.toLocaleString() }}</b>
            </span>
            <input v-model.number="outputTokens" type="range" min="100" max="8000" step="100" :disabled="running" />
          </label>

          <button type="button" class="mito-run" :disabled="running" @click="run">
            <span v-if="running" class="mito-run-spinner" aria-hidden="true"></span>
            {{ running ? t('home.mito.playground.running') : t('home.mito.playground.run') }}
          </button>

          <dl class="mito-estimate">
            <div>
              <dt>{{ t('home.mito.playground.estimate') }}</dt>
              <dd>{{ estimate }}</dd>
            </div>
            <div>
              <dt>{{ t('home.mito.playground.rate') }}</dt>
              <dd>{{ activeModel.rateLabel }}</dd>
            </div>
          </dl>
        </div>

        <!-- Console -->
        <div class="mito-console">
          <div class="mito-console-head">
            <span class="mito-console-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="mito-console-path">gateway · console</span>
          </div>
          <div class="mito-console-body" aria-live="polite" :aria-busy="running">
            <pre v-if="displayedOutput" class="mito-console-json" v-html="highlighted"></pre>
            <p v-else class="mito-console-placeholder">{{ t('home.mito.playground.placeholder') }}</p>
            <span v-if="typing" class="mito-console-caret" aria-hidden="true"></span>
          </div>
          <div class="mito-console-foot">
            <span>{{ t('home.mito.playground.status') }}</span>
            <b :data-state="status">{{ statusLabel }}</b>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModelIcon from '@/components/common/ModelIcon.vue'
import Icon from '@/components/icons/Icon.vue'
import { getModelPlaza } from '@/api/modelPlaza'
import { catalogVendor } from './modelCatalog'
import { BILLING_MODE_TOKEN } from '@/constants/channel'
import type { PlazaModel } from '@/api/modelPlaza'

interface SandboxModel {
  key: string
  name: string
  provider: string
  icon: string
  rateLabel: string
  /** Billing group this offer belongs to; shown in the simulated route. */
  group: string
  /** USD per single token, effective (group/user multiplier applied). */
  inputPrice: number | null
  outputPrice: number | null
  latencyMs: number
  ttftMs: number
}

const { t } = useI18n()
const root = ref<HTMLElement | null>(null)
const models = ref<SandboxModel[]>([])
const loading = ref(true)
const openSelect = ref<'endpoint' | 'model' | null>(null)
const endpoint = ref('/v1/chat/completions')
const activeKey = ref('')
const inputTokens = ref(1200)
const outputTokens = ref(800)
const running = ref(false)
const typing = ref(false)
const output = ref('')
const status = ref<'preview' | 'busy' | 'ok'>('preview')

const endpoints = [
  { value: '/v1/chat/completions', method: 'POST' },
  { value: '/v1/responses', method: 'POST' },
  { value: '/v1/embeddings', method: 'POST' }
]

const activeEndpoint = computed(() => endpoints.find(item => item.value === endpoint.value) ?? endpoints[0])
const activeModel = computed(() => models.value.find(item => item.key === activeKey.value) ?? models.value[0])

function toggle(which: 'endpoint' | 'model') {
  openSelect.value = openSelect.value === which ? null : which
}
function chooseEndpoint(value: string) {
  endpoint.value = value
  openSelect.value = null
}
function chooseModel(key: string) {
  activeKey.value = key
  openSelect.value = null
}

function parsePrice(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function rateLabel(group: { rate_multiplier: number; user_rate_multiplier?: number }): string {
  const rate = group.user_rate_multiplier ?? group.rate_multiplier
  return `${Number(rate.toFixed(4))}${t('home.mito.playground.rateSuffix')}`
}

/** Per-token prices from the same catalog the plaza renders, so the math matches. */
async function load() {
  try {
    const data = await getModelPlaza()
    const list: SandboxModel[] = []
    for (const group of data.groups) {
      for (const model of group.models) {
        const pricing = model.pricing
        if (!pricing || (pricing.billing_mode && pricing.billing_mode !== BILLING_MODE_TOKEN)) continue
        if (list.some(item => item.name === model.name)) continue
        const input = parsePrice(pricing.input_price)
        const output = parsePrice(pricing.output_price)
        if (input == null && output == null) continue
        const vendor = catalogVendor(model as PlazaModel)
        list.push({
          key: `${group.id}:${model.name}`,
          name: model.name,
          provider: vendor.name || model.platform,
          icon: vendor.icon,
          rateLabel: rateLabel(group),
          group: group.name,
          inputPrice: input,
          outputPrice: output,
          latencyMs: latencyFor(model.name),
          ttftMs: ttftFor(model.name)
        })
      }
    }
    // Domestic models lead: the home page is built around them, and the
    // selector should open on the same family the hero names.
    const priority = ['deepseek', 'zhipu', 'moonshot', 'minimax', 'qwen', 'doubao']
    const rank = (item: SandboxModel) => {
      const index = priority.indexOf(catalogVendor({ name: item.name } as PlazaModel).id)
      return index === -1 ? priority.length : index
    }
    list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    models.value = list
    activeKey.value = list[0]?.key ?? ''
  } catch {
    models.value = []
  } finally {
    loading.value = false
  }
}

/**
 * Latency is a per-model presentation constant, not telemetry: the sandbox never
 * calls a model, so it must not look like a live probe.
 */
function latencyFor(name: string): number {
  if (name.includes('kimi')) return 5240
  if (name.includes('glm')) return 4310
  if (name.includes('deepseek')) return 3120
  return 3600
}
function ttftFor(name: string): number {
  return Math.round(latencyFor(name) * 0.16)
}

const estimate = computed(() => {
  const model = activeModel.value
  if (!model) return '—'
  const input = model.inputPrice ?? 0
  const output = model.outputPrice ?? 0
  const total = inputTokens.value * input + outputTokens.value * output
  return `$${total.toFixed(4)}`
})

const statusLabel = computed(() => {
  if (status.value === 'ok') return t('home.mito.playground.stateOk')
  if (status.value === 'busy') return t('home.mito.playground.stateBusy')
  return t('home.mito.playground.statePreview')
})

const highlighted = computed(() => displayedOutput.value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
  .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
  .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>'))

let timers: Array<ReturnType<typeof setTimeout>> = []
let reveal: ReturnType<typeof setInterval> | undefined

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
  if (reveal) {
    clearInterval(reveal)
    reveal = undefined
  }
}

function createResponse(model: SandboxModel, preview: boolean) {
  const jitter = (base: number) => Math.max(40, base - Math.round(Math.random() * 60))
  return {
    id: preview ? 'chatcmpl-preview' : `chatcmpl-${Math.random().toString(36).slice(2, 15)}`,
    status: preview ? 'preview' : 'ok',
    endpoint: endpoint.value,
    model: model.name,
    route: `ADAPTIVE / ${model.group} / ${model.name}`,
    tokens: `${inputTokens.value} in / ${outputTokens.value} out`,
    ttft_ms: preview ? model.ttftMs : jitter(model.ttftMs),
    latency_ms: preview ? model.latencyMs : jitter(model.latencyMs),
    cost: estimate.value,
    rate: model.rateLabel
  }
}

// A complete, deterministic example is visible before the first simulated run.
const preview = computed(() => {
  const model = activeModel.value
  return model ? JSON.stringify(createResponse(model, true), null, 2) : ''
})
const displayedOutput = computed(() => output.value || preview.value)

watch([endpoint, activeKey, inputTokens, outputTokens], () => {
  if (running.value) return
  output.value = ''
  status.value = 'preview'
})

function finish(text: string) {
  output.value = text
  typing.value = false
  running.value = false
  status.value = 'ok'
}

function run() {
  const model = activeModel.value
  if (running.value || !model) return
  clearTimers()
  openSelect.value = null
  running.value = true
  typing.value = false
  output.value = ''
  status.value = 'busy'

  const text = JSON.stringify(createResponse(model, false), null, 2)
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    finish(text)
    return
  }

  timers.push(setTimeout(() => {
    typing.value = true
    let index = 0
    // 8 characters per 8ms, the reference cadence.
    reveal = setInterval(() => {
      index += 8
      output.value = text.slice(0, index)
      if (index >= text.length) {
        if (reveal) clearInterval(reveal)
        reveal = undefined
        finish(text)
      }
    }, 8)
  }, 320))
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') openSelect.value = null
}
function onDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target?.closest('.mito-select')) openSelect.value = null
}

let observer: IntersectionObserver | undefined
onMounted(() => {
  void load()
  window.addEventListener('keydown', onEscape)
  window.addEventListener('click', onDocumentClick)
  const node = root.value
  if (!node || typeof IntersectionObserver === 'undefined') {
    node?.classList.add('is-visible')
    return
  }
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      }
    })
  }, { threshold: 0, rootMargin: '50px 0px 18% 0px' })
  observer.observe(node)
})

onBeforeUnmount(() => {
  clearTimers()
  observer?.disconnect()
  window.removeEventListener('keydown', onEscape)
  window.removeEventListener('click', onDocumentClick)
})
</script>
