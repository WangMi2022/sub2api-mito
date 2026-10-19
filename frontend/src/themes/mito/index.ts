import './theme.css'
import './user-sidebar.css'
import './landing.css'
import './model-plaza.css'
import './model-catalog.css'
import './admin-usage.css'
import './filter-section.css'
import './accounts.css'
import './audit-log.css'
import './channel-status.css'
import './available-channels.css'
import './dashboard.css'
import './ops-monitor.css'
import './table-resize.css'
import './pelican-showcase.css'

/** Build-time escape hatch: VITE_UI_THEME=upstream restores the upstream UI. */
export const isMitoTheme = import.meta.env.VITE_UI_THEME !== 'upstream'

if (typeof document !== 'undefined' && isMitoTheme) {
  document.documentElement.dataset.uiTheme = 'mito'
}
