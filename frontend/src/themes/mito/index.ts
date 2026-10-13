import './theme.css'
import './model-plaza.css'
import './admin-usage.css'

/** Build-time escape hatch: VITE_UI_THEME=upstream restores the upstream UI. */
export const isMitoTheme = import.meta.env.VITE_UI_THEME !== 'upstream'

if (typeof document !== 'undefined' && isMitoTheme) {
  document.documentElement.dataset.uiTheme = 'mito'
}
