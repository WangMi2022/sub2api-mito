/** Keep upstream utility classes usable, with CSS-variable fallbacks for rollback. */
export function withMitoTheme(config) {
  const extend = config.theme.extend
  const primary = Object.fromEntries(Object.entries(extend.colors.primary).map(([shade, hex]) => {
    const rgb = hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16)).join(' ')
    return [shade, `rgb(var(--mito-primary-${shade}, ${rgb}) / <alpha-value>)`]
  }))
  return {
    ...config,
    theme: {
      ...config.theme,
      extend: {
        ...extend,
        colors: { ...extend.colors, primary },
        fontFamily: {
          ...extend.fontFamily,
          sans: ['var(--mito-font, system-ui)', ...extend.fontFamily.sans]
        }
      }
    }
  }
}
