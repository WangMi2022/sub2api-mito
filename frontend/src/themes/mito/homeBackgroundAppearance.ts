export const DEFAULT_BACKGROUND_BLUR = 0
export const DEFAULT_BACKGROUND_OVERLAY = 100

function bounded(value: number | undefined, fallback: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(0, value))
    : fallback
}

/** Keep the public home and the administrator preview visually identical. */
export function homeBackgroundStyle(blur?: number, overlay?: number): Record<string, string> {
  return {
    '--mito-home-blur': `${bounded(blur, DEFAULT_BACKGROUND_BLUR, 20)}px`,
    '--mito-home-overlay': String(bounded(overlay, DEFAULT_BACKGROUND_OVERLAY, 100) / 100)
  }
}
