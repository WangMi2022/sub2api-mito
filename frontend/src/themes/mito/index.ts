import './theme.css'
import './model-plaza.css'
import './admin-usage.css'
import './filter-section.css'
import './accounts.css'
import './audit-log.css'
import './channel-status.css'
import './sidebar.css'
import './table-resize.css'

/** Build-time escape hatch: VITE_UI_THEME=upstream restores the upstream UI. */
export const isMitoTheme = import.meta.env.VITE_UI_THEME !== 'upstream'

if (typeof document !== 'undefined' && isMitoTheme) {
  document.documentElement.dataset.uiTheme = 'mito'
}
