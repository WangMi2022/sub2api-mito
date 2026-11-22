import { describe, expect, it } from 'vitest'
import { resolveChituMenuURL, buildChituSessionStartURL } from '@/utils/chituSSO'

describe('Chitu session continuation links', () => {
  const origin = 'https://chitu.example'
  it('keeps the menu in a new tab on the current Mito browser origin', () => {
    const href = resolveChituMenuURL(origin + '/', origin)!
    expect(href.startsWith('/auth/chitu?')).toBe(true)
    const start = new URL(buildChituSessionStartURL(origin + '/', origin, 'http://legacy-mito.example:8081'))
    expect(start.origin).toBe(origin)
    expect(start.searchParams.get('mito_origin')).toBe('http://legacy-mito.example:8081')
    expect(start.searchParams.has('token')).toBe(false)
  })
  it('retains an allowed business page', () => {
    const start = new URL(buildChituSessionStartURL(origin + '/compute/models', origin, 'https://mito.example'))
    expect(start.searchParams.get('return_to')).toBe('/compute/models')
  })
  it.each([
    'https://chitu.example.evil.invalid/', 'https://other.example/',
    'https://person:password@chitu.example/', 'https://chitu.example/?token=secret',
    'https://chitu.example/#token=secret', 'https://chitu.example/api/v1/admin'
  ])('does not turn an unapproved link into a continuation: %s', target => {
    expect(resolveChituMenuURL(target, origin)).toBe(target)
    expect(() => buildChituSessionStartURL(target, origin, 'https://mito.example')).toThrow()
  })
  it('leaves ordinary custom menus and disabled instances unchanged', () => {
    expect(resolveChituMenuURL('https://docs.example/', origin)).toBe('https://docs.example/')
    expect(resolveChituMenuURL(origin + '/')).toBe(origin + '/')
    expect(resolveChituMenuURL(undefined, origin)).toBeUndefined()
  })
})
