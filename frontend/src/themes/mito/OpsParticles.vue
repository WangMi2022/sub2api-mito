<template>
  <div ref="hostRef" class="mito-ops-particles" aria-hidden="true">
    <canvas ref="canvasRef" class="mito-ops-particles-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
/* Decorative particle field for the ops dashboard. Presentation only: it never
   reads dashboard data, never blocks pointer input and is removed entirely when
   the visitor asks for reduced motion. */
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  phase: number
  signal: boolean
}

const hostRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const MIN_PARTICLES = 24
const MAX_PARTICLES = 84
const AREA_PER_PARTICLE = 24000
const LINK_DISTANCE = 140
const HEADER_OFFSET = 64
const BOTTOM_GAP = 32

const PALETTE = {
  light: { dot: '37, 99, 235', link: '96, 165, 250', signal: '34, 197, 94' },
  dark: { dot: '96, 165, 250', link: '56, 189, 248', signal: '74, 222, 128' }
} as const

let frameHandle = 0
let running = false
let lastTimestamp = 0
let hostTop = 0
let hostHeight = 0
let canvasWidth = 0
let canvasHeight = 0
let particles: Particle[] = []
let resizeObserver: ResizeObserver | null = null

function isDark(): boolean {
  return document.documentElement.classList.contains('dark')
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function targetCount(): number {
  const estimated = Math.round((canvasWidth * canvasHeight) / AREA_PER_PARTICLE)
  return Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, estimated))
}

function createParticle(): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = 0.006 + Math.random() * 0.012
  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 1 + Math.random() * 1.7,
    phase: Math.random() * Math.PI * 2,
    signal: Math.random() < 0.18
  }
}

function syncParticles(): void {
  const count = targetCount()
  if (particles.length > count) particles.length = count
  while (particles.length < count) particles.push(createParticle())
  for (const particle of particles) {
    particle.x = Math.min(Math.max(particle.x, 0), canvasWidth)
    particle.y = Math.min(Math.max(particle.y, 0), canvasHeight)
  }
}

function measure(): void {
  const host = hostRef.value
  const canvas = canvasRef.value
  if (!host || !canvas) return
  const rect = host.getBoundingClientRect()
  hostTop = rect.top + window.scrollY
  hostHeight = rect.height
  canvasWidth = Math.max(1, rect.width)
  canvasHeight = Math.max(220, window.innerHeight - HEADER_OFFSET - BOTTOM_GAP)
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(canvasWidth * ratio)
  canvas.height = Math.round(canvasHeight * ratio)
  canvas.style.height = `${canvasHeight}px`
  const context = canvas.getContext('2d')
  if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0)
  syncParticles()
}

/** Keep the viewport-sized canvas inside the dashboard box while scrolling. */
function position(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const offset = window.scrollY - hostTop
  const maxOffset = Math.max(0, hostHeight - canvasHeight)
  const y = Math.min(Math.max(offset, 0), maxOffset)
  canvas.style.transform = `translate3d(0, ${y}px, 0)`
}

function draw(delta: number): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const context = canvas.getContext('2d')
  if (!context) return
  const colors = isDark() ? PALETTE.dark : PALETTE.light
  const dark = isDark()
  context.clearRect(0, 0, canvasWidth, canvasHeight)

  const aurora = context.createRadialGradient(
    canvasWidth * 0.16,
    canvasHeight * 0.12,
    0,
    canvasWidth * 0.16,
    canvasHeight * 0.12,
    Math.max(canvasWidth, canvasHeight) * 0.62
  )
  aurora.addColorStop(0, dark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(37, 99, 235, 0.10)')
  aurora.addColorStop(1, 'rgba(37, 99, 235, 0)')
  context.fillStyle = aurora
  context.fillRect(0, 0, canvasWidth, canvasHeight)

  for (const particle of particles) {
    particle.x += particle.vx * delta
    particle.y += particle.vy * delta
    particle.phase += delta * 0.0016
    if (particle.x < -24) particle.x = canvasWidth + 24
    else if (particle.x > canvasWidth + 24) particle.x = -24
    if (particle.y < -24) particle.y = canvasHeight + 24
    else if (particle.y > canvasHeight + 24) particle.y = -24
  }

  context.lineWidth = 1
  for (let index = 0; index < particles.length; index += 1) {
    const source = particles[index]
    for (let peer = index + 1; peer < particles.length; peer += 1) {
      const target = particles[peer]
      const dx = source.x - target.x
      const dy = source.y - target.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance > LINK_DISTANCE) continue
      const alpha = (1 - distance / LINK_DISTANCE) * 0.36
      context.strokeStyle = `rgba(${colors.link}, ${alpha.toFixed(3)})`
      context.beginPath()
      context.moveTo(source.x, source.y)
      context.lineTo(target.x, target.y)
      context.stroke()
    }
  }

  for (const particle of particles) {
    const pulse = 0.7 + 0.3 * Math.sin(particle.phase)
    const color = particle.signal ? colors.signal : colors.dot
    context.beginPath()
    context.arc(particle.x, particle.y, particle.radius * (0.9 + pulse * 0.3), 0, Math.PI * 2)
    context.fillStyle = `rgba(${color}, ${(0.32 + pulse * 0.42).toFixed(3)})`
    context.fill()
    if (particle.signal) {
      context.beginPath()
      context.arc(particle.x, particle.y, particle.radius * 4.2 * pulse, 0, Math.PI * 2)
      context.strokeStyle = `rgba(${colors.signal}, ${(0.18 * (1 - pulse)).toFixed(3)})`
      context.stroke()
    }
  }
}

function tick(timestamp: number): void {
  if (!running) return
  frameHandle = window.requestAnimationFrame(tick)
  const delta = lastTimestamp === 0 ? 16 : Math.min(48, timestamp - lastTimestamp)
  lastTimestamp = timestamp
  position()
  draw(delta)
}

function start(): void {
  if (running) return
  running = true
  lastTimestamp = 0
  frameHandle = window.requestAnimationFrame(tick)
}

function stop(): void {
  running = false
  if (frameHandle) window.cancelAnimationFrame(frameHandle)
  frameHandle = 0
}

function handleResize(): void {
  measure()
  position()
  if (!running) draw(0)
}

function handleVisibility(): void {
  if (document.hidden) stop()
  else start()
}

onMounted(() => {
  const host = hostRef.value
  if (!host || !canvasRef.value) return
  // Reduced motion drops the decoration entirely; see ops-monitor.css.
  if (prefersReducedMotion()) return
  measure()
  position()
  draw(0)
  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', handleVisibility)
  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(host)
  start()
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('visibilitychange', handleVisibility)
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>
