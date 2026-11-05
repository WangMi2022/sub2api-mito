/**
 * Common component types
 */

export interface Column {
  key: string
  label: string
  sortable?: boolean
  class?: string
  /** Optional pixel sizing for tables that enable column resizing. */
  width?: number
  minWidth?: number
  maxWidth?: number
  resizable?: boolean
  formatter?: (value: any, row: any) => string
}
