<template>
  <section id="gateway-workbench" ref="root" class="yuyu-projects-section yuyu-reveal">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="yuyu-workbench-heading">
        <div class="yuyu-section-heading yuyu-section-heading-standard">
          <span>Unified Orchestration Workspace</span>
          <h2 class="hero-heading">{{ t('home.mito.workbench.title') }}</h2>
          <p>{{ t('home.mito.workbench.subtitle') }}</p>
        </div>
        <router-link :to="entryPath" class="yuyu-workbench-entry">
          <Icon name="arrowRight" size="md" />
          {{ t('home.mito.workbench.enter') }}
        </router-link>
      </div>

      <div class="yuyu-console-workbench-frame">
        <div class="yuyu-console-workbench">
          <header class="yuyu-console-header">
            <div class="yuyu-console-header-left">
              <span class="yuyu-console-title">{{ t('home.mito.workbench.consoleTitle') }}</span>
              <div class="yuyu-console-badge-list">
                <span class="yuyu-console-badge is-active">
                  <i></i>
                  <b>{{ t('home.mito.workbench.ready') }}</b>
                </span>
                <span class="yuyu-console-badge">
                  <i></i>
                  <b>{{ t('home.mito.workbench.standby', { count: 3 }) }}</b>
                </span>
              </div>
            </div>
            <div class="yuyu-console-header-right">
              <span>{{ t('home.mito.workbench.activeModel') }} · {{ activeChannel.name }}</span>
              <span>{{ t('home.mito.workbench.packetDelay') }} · {{ ttft }}ms</span>
            </div>
          </header>

          <div class="yuyu-console-body">
            <div class="yuyu-console-left-panel">
              <div class="yuyu-console-sec-title">{{ t('home.mito.workbench.topology') }}</div>
              <div class="yuyu-console-topology">
                <svg viewBox="0 0 600 220" role="img" :aria-label="t('home.mito.workbench.topology')">
                  <defs>
                    <linearGradient id="yuyu-topo-line" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stop-color="var(--wb-accent-bright)" stop-opacity="0.12" />
                      <stop offset="50%" stop-color="var(--wb-accent-bright)" stop-opacity="0.55" />
                      <stop offset="100%" stop-color="var(--wb-accent-bright)" stop-opacity="0.12" />
                    </linearGradient>
                  </defs>
                  <ellipse class="topo-orbit" cx="300" cy="110" rx="240" ry="64" />
                  <ellipse class="topo-orbit is-inner" cx="300" cy="110" rx="150" ry="40" />
                  <path class="topo-line" d="M70 110H540" />
                  <path class="topo-line is-dashed" d="M70 110H540" />
                  <g class="topo-node-group">
                    <circle class="topo-node" cx="70" cy="110" r="14" />
                    <circle class="topo-pulse" cx="70" cy="110" r="6" />
                    <text class="topo-node-label" x="70" y="146">Client SDK</text>
                  </g>
                  <g class="topo-node-group">
                    <circle class="topo-node" cx="230" cy="110" r="16" />
                    <circle class="topo-pulse" cx="230" cy="110" r="6" />
                    <text class="topo-node-label" x="230" y="148">YUYU Router</text>
                  </g>
                  <g class="topo-node-group">
                    <circle class="topo-node" :class="{ 'is-active': policy !== 'failover' }" cx="390" cy="110" r="14" />
                    <circle class="topo-pulse" cx="390" cy="110" r="4" />
                    <text class="topo-node-label" x="390" y="146">Edge Relay</text>
                  </g>
                  <g class="topo-node-group">
                    <circle class="topo-node" cx="530" cy="110" r="16" />
                    <circle class="topo-pulse" cx="530" cy="110" r="6" />
                    <text class="topo-node-label" x="530" y="148">Upstream</text>
                  </g>
                </svg>
              </div>

              <div class="yuyu-console-policy-group">
                <h4 class="yuyu-console-sec-title">{{ t('home.mito.workbench.policyTitle') }}</h4>
                <div class="yuyu-console-policy-pills" role="group" :aria-label="t('home.mito.workbench.policyTitle')">
                  <button
                    v-for="item in policies"
                    :key="item.id"
                    type="button"
                    class="yuyu-console-policy-pill"
                    :class="{ 'is-active': policy === item.id }"
                    @click="policy = item.id"
                  >
                    <strong>{{ item.label }}</strong>
                    <small>{{ t(item.labelKey) }}</small>
                  </button>
                </div>
                <p class="yuyu-console-policy-desc">{{ t(activePolicy.descriptionKey) }}</p>
              </div>

              <div class="yuyu-console-channel-group">
                <h4 class="yuyu-console-sec-title">{{ t('home.mito.workbench.channelTitle') }}</h4>
                <div class="yuyu-console-channel-grid">
                  <button
                    v-for="channel in channels"
                    :key="channel.id"
                    type="button"
                    class="yuyu-console-channel-btn"
                    :class="{ 'is-active': activeChannel.id === channel.id }"
                    @click="selectChannel(channel)"
                  >
                    <span class="yuyu-channel-logo" :style="{ '--channel-color': channel.color }">
                      {{ channel.mark }}
                    </span>
                    <strong>{{ channel.name }}</strong>
                  </button>
                </div>
              </div>

              <div class="yuyu-console-calculator">
                <div class="yuyu-console-calc-row">
                  <span>{{ t('home.mito.workbench.volume') }}</span>
                  <b>{{ volumeLabel }} Tokens</b>
                </div>
                <div class="yuyu-console-slider-wrapper">
                  <input
                    v-model.number="monthlyTokens"
                    type="range"
                    min="1000000"
                    max="100000000"
                    step="1000000"
                    :aria-label="t('home.mito.workbench.volume')"
                  />
                  <div class="yuyu-console-slider-ticks" aria-hidden="true">
                    <span>1M</span>
                    <span>50M</span>
                    <span>100M</span>
                  </div>
                </div>
                <div class="yuyu-console-cost-comparison">
                  <div class="yuyu-console-cost-bar-item is-official">
                    <small>{{ t('home.mito.workbench.officialPrice') }}</small>
                    <div class="yuyu-console-bar-track">
                      <div class="yuyu-console-bar-fill" :style="{ width: '100%' }"></div>
                    </div>
                    <strong>{{ formatUsd(officialCost) }}</strong>
                  </div>
                  <div class="yuyu-console-cost-bar-item is-yuyu">
                    <small>{{ t('home.mito.workbench.ourPrice') }}</small>
                    <div class="yuyu-console-bar-track">
                      <div class="yuyu-console-bar-fill" :style="{ width: `${ourBarWidth}%` }"></div>
                    </div>
                    <strong>{{ formatUsd(ourCost) }}</strong>
                  </div>
                </div>
                <div class="yuyu-console-calc-row yuyu-console-saved-row">
                  <template v-if="isParity">
                    <span>{{ t('home.mito.workbench.parityNote') }}</span>
                    <b class="is-accent">{{ formatUsd(ourCost) }} / {{ t('home.mito.workbench.monthUnit') }}</b>
                  </template>
                  <template v-else>
                    <span>{{ t('home.mito.workbench.monthlySaved') }}</span>
                    <b class="is-accent">{{ formatUsd(monthlySaved) }} / {{ t('home.mito.workbench.monthUnit') }} ({{ savedLabel }})</b>
                  </template>
                </div>
              </div>
            </div>

            <div class="yuyu-console-right-panel">
              <div class="yuyu-console-terminal-shell">
                <div class="yuyu-console-terminal-head">
                  <div class="yuyu-console-terminal-dots" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </div>
                  <span>{{ activeChannel.terminal }}</span>
                </div>
                <div class="yuyu-console-terminal-inputs">
                  <label class="yuyu-console-field">
                    <span>{{ t('home.mito.workbench.prompt') }}</span>
                    <textarea v-model="prompt" rows="2" :placeholder="t('home.mito.workbench.promptPlaceholder')"></textarea>
                  </label>
                  <div class="yuyu-console-param-row">
                    <label class="yuyu-console-dial">
                      <span>{{ t('home.mito.workbench.temperature') }}</span>
                      <div class="yuyu-console-select-wrap">
                        <select v-model.number="temperature" class="yuyu-console-select">
                          <option v-for="item in temperatures" :key="item.value" :value="item.value">{{ item.label }}</option>
                        </select>
                        <span class="yuyu-console-select-value">{{ temperatureLabel }}</span>
                        <Icon name="chevronDown" size="sm" />
                      </div>
                    </label>
                    <label class="yuyu-console-dial">
                      <span>{{ t('home.mito.workbench.endpoint') }}</span>
                      <div class="yuyu-console-select-wrap">
                        <select v-model="endpoint" class="yuyu-console-select">
                          <option v-for="item in endpoints" :key="item.value" :value="item.value">{{ item.description }}</option>
                        </select>
                        <span class="yuyu-console-select-value">{{ endpointMethod }} {{ endpointDescription }}</span>
                        <Icon name="chevronDown" size="sm" />
                      </div>
                    </label>
                  </div>
                  <button type="button" class="yuyu-console-dispatch-btn" :disabled="running" @click="dispatch">
                    <span v-if="running" class="yuyu-console-spinner" aria-hidden="true"></span>
                    {{ running ? t('home.mito.workbench.dispatching') : t('home.mito.workbench.runDispatch') }}
                  </button>
                </div>
                <div class="yuyu-console-terminal-output" aria-live="polite">
                  <pre v-if="result" class="yuyu-console-json" v-html="highlightedResult"></pre>
                  <div v-else class="yuyu-console-terminal-placeholder">
                    <span>{{ t('home.mito.workbench.outputPlaceholder') }}</span>
                  </div>
                </div>
              </div>

              <div class="yuyu-console-hud">
                <div class="yuyu-radar-hud" :class="{ 'is-scanning': running }">
                  <div class="yuyu-radar-rings" aria-hidden="true">
                    <span class="yuyu-radar-ring"></span>
                    <span class="yuyu-radar-ring is-mid"></span>
                    <span class="yuyu-radar-ring is-inner"></span>
                    <span class="yuyu-radar-sweep"></span>
                    <i class="yuyu-radar-blip"></i>
                  </div>
                </div>
                <div class="yuyu-console-hud-metrics">
                  <div class="yuyu-console-hud-item">
                    <small>TTFT</small>
                    <strong>{{ ttft }} <em>ms</em></strong>
                  </div>
                  <div class="yuyu-console-hud-item">
                    <small>SPEED</small>
                    <strong>{{ speed }} <em>t/s</em></strong>
                  </div>
                  <div class="yuyu-console-hud-item is-saved">
                    <small>{{ t('home.mito.workbench.savedRatio') }}</small>
                    <strong>{{ savedLabel }}</strong>
                  </div>
                </div>
              </div>

              <div class="yuyu-console-trace-group">
                <div class="yuyu-console-trace-head">
                  <span class="yuyu-console-sec-title">{{ t('home.mito.workbench.trace') }}</span>
                  <span class="yuyu-trace-status">{{ t('home.mito.workbench.live') }}</span>
                </div>
                <div class="yuyu-console-trace-container">
                  <div
                    v-for="entry in trace"
                    :key="entry.id"
                    class="yuyu-console-trace-item"
                    :class="`is-${entry.type}`"
                  >
                    <span class="log-time">{{ entry.time }}</span>
                    <span class="log-prefix">{{ entry.prefix }}</span>
                    <span class="log-text">{{ entry.text }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps<{
  isAuthenticated: boolean
  dashboardPath: string
}>()

const { t } = useI18n()
const entryPath = computed(() => (props.isAuthenticated ? '/keys' : '/login'))

interface Policy {
  id: string
  label: string
  labelKey: string
  descriptionKey: string
}

interface Channel {
  id: string
  /** Actual model ID sent to the gateway, not the display label. */
  model: string
  name: string
  mark: string
  color: string
  terminal: string
  officialInput: number
  officialOutput: number
  ourInput: number
  ourOutput: number
  baseTtft: number
  latency: number
  speed: number
}

interface TraceEntry {
  id: number
  type: 'info' | 'success'
  prefix: string
  text: string
  time: string
}

interface DispatchResult {
  id: string
  status: string
  endpoint: string
  model: string
  route: string
  tokens: string
  ttft_ms: number
  latency_ms: number
  cost: string
  /** Charged amount as a share of the vendor list price. */
  cost_ratio: string
}

const policies: Policy[] = [
  { id: 'auto', label: 'AUTO', labelKey: 'home.mito.workbench.policies.auto', descriptionKey: 'home.mito.workbench.policyDesc.auto' },
  { id: 'low-ttft', label: 'LOW TTFT', labelKey: 'home.mito.workbench.policies.lowTtft', descriptionKey: 'home.mito.workbench.policyDesc.lowTtft' },
  { id: 'failover', label: 'FAILOVER', labelKey: 'home.mito.workbench.policies.failover', descriptionKey: 'home.mito.workbench.policyDesc.failover' }
]

const channels: Channel[] = [
  {
    id: 'deepseek',
    model: 'deepseek-v4.1-flash',
    name: 'DeepSeek V4.1',
    mark: 'DS',
    color: '#3b82f6',
    terminal: 'yuyu-dispatcher-deepseek.terminal',
    officialInput: 0.15,
    officialOutput: 0.6,
    ourInput: 0.15,
    ourOutput: 0.6,
    baseTtft: 486,
    latency: 3120,
    speed: 47.7
  },
  {
    id: 'glm',
    model: 'glm-5.3',
    name: 'GLM-5.3',
    mark: 'GLM',
    color: '#8b5cf6',
    terminal: 'yuyu-dispatcher-glm.terminal',
    officialInput: 1.4,
    officialOutput: 4.4,
    ourInput: 1.4,
    ourOutput: 4.4,
    baseTtft: 742,
    latency: 4310,
    speed: 36.2
  },
  {
    id: 'kimi',
    model: 'kimi-k3',
    name: 'Kimi K3',
    mark: 'K3',
    color: '#0ea5e9',
    terminal: 'yuyu-dispatcher-kimi.terminal',
    officialInput: 2.94807,
    officialOutput: 14.740349,
    ourInput: 2.94807,
    ourOutput: 14.740349,
    baseTtft: 649,
    latency: 5240,
    speed: 6.5
  }
]

const temperatures = [
  { value: 0.3, label: '0.3' },
  { value: 0.7, label: '0.7' },
  { value: 1, label: '1.0' }
]

const endpoints = [
  { value: '/v1/chat/completions', description: 'Chat Completions', method: 'POST' },
  { value: '/v1/responses', description: 'Responses API', method: 'POST' },
  { value: '/v1/embeddings', description: 'Embeddings', method: 'POST' },
  { value: '/v1/images', description: 'Images', method: 'POST' }
]

const root = ref<HTMLElement | null>(null)
let revealObserver: IntersectionObserver | undefined

const policy = ref('auto')
const activeChannel = ref<Channel>(channels[0])
const monthlyTokens = ref(10_000_000)
const prompt = ref('用一句话介绍你自己')
const temperature = ref(0.7)
const endpoint = ref(endpoints[0].value)
const running = ref(false)
const result = ref<DispatchResult | null>(null)
const ttft = ref(channels[0].baseTtft)
const speed = ref(channels[0].speed)
const trace = ref<TraceEntry[]>([
  {
    id: 1,
    type: 'info',
    prefix: '[SYS]',
    text: t('home.mito.workbench.traceReady'),
    time: '17:06:00.02'
  },
  {
    id: 2,
    type: 'info',
    prefix: '[SYS]',
    text: t('home.mito.workbench.tracePools'),
    time: '17:06:00.04'
  },
  {
    id: 3,
    type: 'success',
    prefix: '[SECURE]',
    text: t('home.mito.workbench.traceEdge'),
    time: '17:06:00.08'
  }
])

let traceSeq = trace.value.length
let traceTimer: ReturnType<typeof setTimeout> | undefined

const activePolicy = computed(() => policies.find((item) => item.id === policy.value) ?? policies[0])
const temperatureLabel = computed(() => temperatures.find((item) => item.value === temperature.value)?.label ?? '0.7')
const activeEndpoint = computed(() => endpoints.find((item) => item.value === endpoint.value) ?? endpoints[0])
const endpointMethod = computed(() => activeEndpoint.value.method)
const endpointDescription = computed(() => activeEndpoint.value.description)

/** Both the preview and a dispatch use the reference console's token spread. */
const SAMPLE_TOKENS = { input: 1200, output: 800 }

const averageOfficial = computed(
  () => (activeChannel.value.officialInput + activeChannel.value.officialOutput) / 2
)
const averageOur = computed(() => (activeChannel.value.ourInput + activeChannel.value.ourOutput) / 2)
const officialCost = computed(() => (monthlyTokens.value / 1_000_000) * averageOfficial.value)
const ourCost = computed(() => (monthlyTokens.value / 1_000_000) * averageOur.value)
const monthlySaved = computed(() => Math.max(0, officialCost.value - ourCost.value))
const savedPercent = computed(() => {
  if (officialCost.value <= 0) return '0.0'
  return ((monthlySaved.value / officialCost.value) * 100).toFixed(1)
})
const isParity = computed(() => monthlySaved.value < 0.005)
const savedLabel = computed(() => (isParity.value ? t('home.mito.workbench.parity') : `${savedPercent.value}%`))
const ourBarWidth = computed(() => {
  if (officialCost.value <= 0) return 10
  return Math.max(10, Math.min(100, (ourCost.value / officialCost.value) * 100))
})
const volumeLabel = computed(() => `${Math.round(monthlyTokens.value / 1_000_000)}M`)

const highlightedResult = computed(() => {
  if (!result.value) return ''
  const json = JSON.stringify(result.value, null, 2)
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
})

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

function buildPayload(channel: Channel, live: boolean): DispatchResult {
  const cost = (monthlyTokens.value / 1_000_000) * ((channel.ourInput + channel.ourOutput) / 2)
  return {
    id: `chatcmpl-${Math.random().toString(36).slice(2, 15)}`,
    status: live ? 'ok' : 'preview',
    endpoint: endpoint.value,
    model: channel.model,
    route: `ADAPTIVE / ${channel.id}-01`,
    tokens: `${SAMPLE_TOKENS.input} in / ${SAMPLE_TOKENS.output} out`,
    ttft_ms: channel.baseTtft,
    latency_ms: channel.latency,
    cost: `$${cost.toFixed(4)}`,
    cost_ratio: savedLabel.value
  }
}

/**
 * The console is never empty: it shows a preview built from the selected
 * channel so the panel reads as a live sample instead of an empty box.
 */
function previewResult() {
  const channel = activeChannel.value
  result.value = buildPayload(channel, false)
  ttft.value = channel.baseTtft
  speed.value = channel.speed
}

function selectChannel(channel: Channel) {
  activeChannel.value = channel
  previewResult()
}

function nowStamp() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0').slice(0, 2)
}

function pushTrace(type: TraceEntry['type'], prefix: string, text: string) {
  trace.value = [...trace.value.slice(-5), { id: ++traceSeq, type, prefix, text, time: nowStamp() }]
}

function clearTimers() {
  if (traceTimer) {
    clearTimeout(traceTimer)
    traceTimer = undefined
  }
}

function dispatch() {
  if (running.value) return
  running.value = true
  result.value = null
  const channel = activeChannel.value
  pushTrace('info', '[TOPOLOGY]', t('home.mito.workbench.traceTopology', { route: `${channel.id}-01` }))

  traceTimer = setTimeout(() => {
    const ping = Math.max(50, channel.baseTtft - Math.floor(Math.random() * 30))
    ttft.value = ping
    pushTrace('info', '[UPSTREAM]', t('home.mito.workbench.traceUpstream', { model: channel.name, id: `${channel.id}-01`, ping }))

    traceTimer = setTimeout(() => {
      const nextTtft = Math.max(50, channel.baseTtft - Math.floor(Math.random() * 30))
      const nextSpeed = channel.speed + Math.floor(Math.random() * 12) - 5
      const nextLatency = channel.latency + Math.floor(Math.random() * 80) - 40
      ttft.value = nextTtft
      speed.value = nextSpeed
      result.value = {
        ...buildPayload(channel, true),
        ttft_ms: nextTtft,
        latency_ms: nextLatency,
        route: `${policy.value === 'failover' ? 'FAILOVER' : policy.value === 'low-ttft' ? 'LOW TTFT' : 'ADAPTIVE'} / ${channel.id}-01`
      }
      pushTrace('success', '[SUCCESS]', t('home.mito.workbench.traceSuccess', { saved: savedLabel.value }))
      running.value = false
    }, 650)
  }, 320)
}

onMounted(() => {
  previewResult()
  const node = root.value
  if (!node || typeof IntersectionObserver === 'undefined') {
    node?.classList.add('is-visible')
    return
  }
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          revealObserver?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0, rootMargin: '50px 0px 18% 0px' }
  )
  revealObserver.observe(node)
})

onBeforeUnmount(() => {
  clearTimers()
  revealObserver?.disconnect()
})
</script>
