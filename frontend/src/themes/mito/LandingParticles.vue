<template>
  <div class="mito-particles" aria-hidden="true">
    <div class="mito-aurora mito-aurora-a"></div>
    <div class="mito-aurora mito-aurora-b"></div>
    <div class="mito-aurora mito-aurora-c"></div>
    <canvas ref="canvasRef" class="mito-particles-canvas"></canvas>
    <div class="mito-particles-vignette"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Ambient particle field for the landing hero.
 *
 * Deliberately no connecting lines or constellation webs: only soft, depth-sorted
 * glows drifting upward, so the motion reads as atmosphere rather than decoration.
 * Static frame under `prefers-reduced-motion`; paused while the tab is hidden.
 */
interface Particle {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  alpha: number
  hue: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let frame = 0
let particles: Particle[] = []
let width = 0
let height = 0
let dpr = 1
let reduced = false
let pointerX = 0
let pointerY = 0
let targetX = 0
let targetY = 0

const MAX_PARTICLES = 54

function seed() {
  const count = Math.min(MAX_PARTICLES, Math.round((width * height) / 26000))
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 0.6 + Math.random() * 2.4,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -(0.05 + Math.random() * 0.22),
    alpha: 0.18 + Math.random() * 0.5,
    hue: 200 + Math.random() * 40
  }))
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = Math.max(1, rect.width || canvas.clientWidth || 1)
  height = Math.max(1, rect.height || canvas.clientHeight || 1)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  try {
    ctx = canvas.getContext('2d')
  } catch {
    // jsdom and other headless DOMs without canvas support: the aurora layers
    // still render, so this is purely decorative.
    ctx = null
  }
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  seed()
  draw()
}

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)

  // Ease the whole field toward the pointer for a subtle parallax.
  pointerX += (targetX - pointerX) * 0.04
  pointerY += (targetY - pointerY) * 0.04

  for (const p of particles) {
    const x = p.x + pointerX * (p.r * 0.9)
    const y = p.y + pointerY * (p.r * 0.9)
    const glow = ctx.createRadialGradient(x, y, 0, x, y, p.r * 7)
    glow.addColorStop(0, `hsla(${p.hue}, 92%, 68%, ${p.alpha})`)
    glow.addColorStop(0.45, `hsla(${p.hue}, 92%, 62%, ${p.alpha * 0.28})`)
    glow.addColorStop(1, `hsla(${p.hue}, 92%, 60%, 0)`)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, p.r * 7, 0, Math.PI * 2)
    ctx.fill()
  }
}

function tick() {
  if (!ctx) return
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    if (p.y < -20) {
      p.y = height + 20
      p.x = Math.random() * width
    }
    if (p.x < -20) p.x = width + 20
    if (p.x > width + 20) p.x = -20
  }
  draw()
  frame = requestAnimationFrame(tick)
}

function start() {
  if (!ctx || frame || document.hidden) return
  if (reduced) {
    draw()
    return
  }
  frame = requestAnimationFrame(tick)
}

function stop() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

function onPointerMove(event: PointerEvent) {
  if (reduced) return
  targetX = (event.clientX / window.innerWidth - 0.5) * 26
  targetY = (event.clientY / window.innerHeight - 0.5) * 18
}

function onVisibility() {
  if (document.hidden) stop()
  else start()
}

let ro: ResizeObserver | null = null
let motionQuery: MediaQueryList | null = null

function onMotionChange(event: MediaQueryListEvent) {
  reduced = event.matches
  stop()
  if (reduced) {
    pointerX = pointerY = targetX = targetY = 0
  }
  draw()
  start()
}

onMounted(() => {
  // jsdom has no canvas backend; the aurora layers are enough there.
  if (import.meta.env.MODE === 'test') return
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced = motionQuery.matches
  motionQuery.addEventListener('change', onMotionChange)
  resize()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(resize)
    if (canvasRef.value) ro.observe(canvasRef.value)
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  start()
})

onBeforeUnmount(() => {
  stop()
  ro?.disconnect()
  motionQuery?.removeEventListener('change', onMotionChange)
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>
