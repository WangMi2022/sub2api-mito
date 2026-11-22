const allowedPaths = new Set([
  '/', '/admin/projects', '/compute/servers', '/compute/resources', '/compute/models',
  '/compute/deployments', '/compute/instances', '/compute/services', '/compute/scheduling',
  '/compute/performance', '/compute/costs'
])

function trustedDestination(target: string, origin: string): URL {
  const url = new URL(target)
  if (!origin || url.origin !== origin || url.username || url.password ||
      url.search || url.hash || !allowedPaths.has(url.pathname)) {
    throw new Error('Invalid Chitu destination')
  }
  return url
}

/** Preserve the external anchor/new-tab behavior while using this Mito origin's session. */
export function resolveChituMenuURL(externalURL?: string, origin?: string): string | undefined {
  if (!externalURL || !origin) return externalURL
  try {
    const target = trustedDestination(externalURL, origin)
    return '/auth/chitu?' + new URLSearchParams({ target: target.href }).toString()
  } catch {
    return externalURL
  }
}

export function buildChituSessionStartURL(target: string, origin: string, mitoOrigin: string): string {
  const destination = trustedDestination(target, origin)
  const url = new URL('/api/v1/auth/mito/start', origin)
  url.searchParams.set('mito_origin', mitoOrigin)
  if (destination.pathname !== '/') url.searchParams.set('return_to', destination.pathname)
  return url.href
}
